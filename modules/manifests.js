const path = require('path');
const fs = require('fs');

const moment = require('moment');
const json2csv = require('json2csv');
const formidable = require('formidable');

const Promise = require('bluebird');
const readDir = Promise.promisify(fs.readdir);
const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);
const fileStats = Promise.promisify(fs.stat);

const manParse = require(path.join(__config.libDir.manifestParse, 'lib'));

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));
const inmarDb = require(path.join(__basedir, __config.modulesPath, 'inmar-db'));
const productData = require(path.join(__basedir, __config.modulesPath, 'product-data'));

const manifestFilesPath = path.join(__basedir, __config.manifestFilesPath);
if(!fs.existsSync(manifestFilesPath)) {
	fs.mkdirSync(manifestFilesPath);
}

const manifestFilenamePattern = /^(.*?)-?(bstock)?-([0-9a-fA-F]{24}).csv$/;
function parseManifestFilename(filename) {
	const match = filename.match(manifestFilenamePattern);
	return match ? { filename: filename, handle: match[1], format: match[2] ? match[2] : 'default', _id: match[3] } : null;
}

function humanReadableSize(size) {
	let units;
	if (size >= 1000 * 1000) {
		size = size /1000 /1000;
		units = 'MB';
	}
	else if (size >= 1000) {
		size = size /1000;
		units = 'KB';
	}
	else {
		units = 'B';
	}
	return `${size}${units}`;
}

function listManifestFiles(req, res) {
	//TODO: set from request
	const limit = 25;

	readDir(manifestFilesPath).then(files=>{
		const fileData = [];
		for(let f of files.map(parseManifestFilename).filter(x=>x)) {
			fileData.push(fileStats(path.join(manifestFilesPath, f.filename)).then(stats=>{
				f.updatedAt = stats.mtime;
				f.size = humanReadableSize(stats.size);
				return f;
			}))
		}
		return Promise.all(fileData);
	})
	.then(files=>{
		return files.sort((a,b) => (new Date(a.updatedAt)) < (new Date(b.updatedAt)))
	})
	.then(files=>{
		return files.slice(0, limit);
	})
	.then(files=>{
		res.json({
			status: 'success',
			files: files,
		});
	}).
	catch(err=>{
		__logger.error(err);
		res.json({
			status: 'error',
			error: err.toString()
		});
	})
}

function getProductData(inventory) {
	console.log(`Retreiving API product data for ${inventory.length} products`)
	const productDataReqs = [];
	for(let manifestItem of inventory) {
		productDataReqs.push(
			productData.getProductDataByBarcode(manifestItem.barcode).then(retrievedProductData => {
				//TODO: got to be more careful with this data merge. What if one of these objects has a property but it's blank?
				const res = {
					barcode: retrievedProductData.normalizedBarcode ? retrievedProductData.normalizedBarcode : manifestItem.barcode,
					title:  manifestItem.title || manifestItem.description || retrievedProductData.title,
					quantity: manifestItem.quantity,
					price: manifestItem.price || retrievedProductData.price,
				}

				return res;
			})
		);
	}
	return Promise.all(productDataReqs)
}

function formatManifestFromInventoryProductData(opts={}) {
	return inventoryProductData => {
		let totalRetailValue = 0;
		const manifestItems = inventoryProductData.sort((a,b) => a[0].barcode.localeCompare(b[0].barcode)).map(inventoryItem=>{

			let productTitle;
			if(inventoryItem.title) {
				productTitle = inventoryItem.title;
			}
			else if (opts.defaultProductTitle) {
				productTitle = opts.defaultProductTitle;
			}
			else {
				productTitle = 'UNKNOWN';
			}

			if(inventoryItem.price) {
				totalRetailValue += inventoryItem.price*inventoryItem.quantity;
				inventoryItem.price = inventoryItem.price.toFixed(2);
			}

			let item;
			if(opts.bstock) {
				item = {
					Category: opts.bstock.Category,
					'Item Description': productTitle,
					Qty: inventoryItem.quantity,
					'Retail Per Unit': inventoryItem.price,
					Condition: opts.bstock.Condition,
					Packaging: opts.bstock.Packaging,
					UPC: productBarcode,
					Manufacturer: '',
					Model: '',
					'Expiration Date': '',
				}
			}
			else {
				item = {
					barcode: productBarcode,
					title: productTitle,
					unitPrice: inventoryItem.price,
					quantity: inventoryItem.quantity,
				}
			}

			return item;
		});

		manifestItems.totalRetailValue = totalRetailValue;

		return manifestItems;
	}
}

function buildManifestItems(inventory, opts={}) {
	//TODO: seemed to call getProductData even if hasProductData true
	return (opts.refreshProductData ? getProductData(inventory) : Promise.resolve(inventory) ).then(formatManifestFromInventoryProductData(opts));
}

function defaultProductTitleForLot(lot){
	let title;
	if(lot.handle.match(/PC/)) {
		title = 'Personal Care Product';
	}
	else if(lot.handle.match(/GM/)) {
		title = 'General Merchandise';
	}
	else if(lot.handle.match(/VT/)) {
		title = 'Vitamins & Supplements';
	}
	else if(lot.handle.match(/CS/)) {
		title = 'Cosmetics';
	}
	else if(lot.handle.match(/NP/)) {
		title = 'Nail Polish';
	}
	return title;
}

function getManifestItemsForLot(lot, opts={}) {
	if(!opts.defaultProductTitle) {
		opts.defaultProductTitle = defaultProductTitleForLot(lot);
	}

	const scannedManifestP = lot.manifestId ? mandb.getManifestById(lot.manifestId).then(m => m.toObject().inventory) : Promise.resolve([]);
	const thirdPartyManifestP = lot.thirdPartyManifests.length ? inmarDb.getBlockByBlockId(lot.thirdPartyManifests[0].blockId).then(b => b.contents) : Promise.resolve([]);
	return Promise.join(scannedManifestP, thirdPartyManifestP).spread(async (scannedInventory, thirdPartyInventory)=>{
		const inventory = scannedInventory.concat(thirdPartyInventory)
		return buildManifestItems(inventory, opts);
	});
}

async function getManifestCsv(lot, manifestOpts={}) {
	return json2csv.parse(await getManifestItemsForLot(lot, manifestOpts));
}

async function generateManifestFile(req, res, next){
	const lotId = req.body.lotId;
	const manifestOpts = {};
	if(req.body.bstock) {
		manifestOpts.bstock = req.body.bstock;
	}

	const lot = await lotdb.getLotById(lotId);
	if(!lot) {
		next(new Error(`No lot for id ${lotId}`));
	}
	res.json({ status: 'submitted' });

	const manifestCsv = await getManifestCsv(lot, manifestOpts);
	const filename = path.join(manifestFilesPath, `${lot.handle}${req.body.bstock? '-bstock': ''}-${lot._id}.csv`);
	writeFile(filename, manifestCsv).then(()=>{__logger.info(`Manifest written to ${filename}`)});
}

function downloadManifestFile(req, res) {
	//TODO: test file existence then download
	try {
    res.download(path.join(manifestFilesPath, req.params.file));
	}
	catch (err) {
		__logger.error(err)
		res.json({
			status: 'error',
			error: err.toString()
		});
	}
}

function submit3pManifest(req,res,next) {
	const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  	manParse.parse(files.file.path, JSON.parse(fields.parseOpts))
  	.catch(e=>{
			e.clientMessage = 'Error parsing uploaded file. Check if all settings are correct.';
			throw e;
  	}).
  	then(blocks=>{
  		const manifest = {};
  		if(fields.liquidationSource) {
  			manifest.liquidationSource = fields.liquidationSource;
  		}
  		if(fields.purchasingSource) {
  			manifest.purchasingSource = fields.purchasingSource;
  		}
  		if(fields.type) {
  			manifest.type = fields.type;
  		}
  		if(fields.priceType) {
  			manifest.priceType = fields.priceType;
  		}
  		manifest.blocks = Object.entries(blocks).map( item => {
  			return { blockId: item[0], contents: item[1] }
  		});
			//TODO: handle other purchasing sources besides inmar
  		inmarDb.newManifest(manifest).then(newManifest=>{
				res.json(newManifest);  			
  		})
	  })
	  .catch(e=>{
	  	// Customize server error messages
	  	next(e);
	  })
	})
}

function boilerplateManifestItems(lot, manifestOptions) {
	let item;
	item = {
		Category: manifestOptions.bstock.Category,
		'Item Description': lot.listingData.title,
		Qty: lot.totalUnits,
		'Retail Per Unit': '13.99',
		Condition: manifestOptions.bstock.Condition,
		Packaging: manifestOptions.bstock.Packaging,
		UPC: '',
		Manufacturer: '',
		Model: '',
		'Expiration Date': '',
	};
	return [item];
}

module.exports = {
	getManifestItemsForLot: getManifestItemsForLot,
	listManifestFiles: listManifestFiles,
	generateManifestFile: generateManifestFile,
	downloadManifestFile: downloadManifestFile,
	submit3pManifest: submit3pManifest,
	boilerplateManifestItems: boilerplateManifestItems,
}