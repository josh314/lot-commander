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

function buildManifestCsv(inventory, opts) {
	const productDataReqs = [];
	for(item of inventory) {
		productDataReqs.push(Promise.join(item, productData.getProductDataByBarcode(item.barcode)));
		// dbReqs.push(ehdb.)
	}
	return Promise.all(productDataReqs).then(inventoryData=>{
		const manifestItems = inventoryData.sort((a,b) => a[0].barcode.localeCompare(b[0].barcode)).map(x=>{
			const [item, productData] = x;

			let csvLineItem;
			if(opts.bstock) {
				csvLineItem = {
					Category: opts.bstock.Category,
					'Item Description': productData.title,
					Qty: item.quantity,
					'Retail Per Unit': productData.price,
					Condition: opts.bstock.Condition,
					Packaging: opts.bstock.Packaging,
					UPC: item.barcode,
					Manufacturer: '',
					Model: '',
					'Expiration Date': '',
				}
			}
			else {
				csvLineItem = {
					barcode: item.barcode,
					title: productData.title,
					unitPrice: productData.price,
					quantity: item.quantity,
				}
			}

			return csvLineItem;
		});
		return json2csv.parse(manifestItems);
	});
}

function generateManifestFile(req, res){
	const manifestId = req.body.manifestId;
	const manifestOpts = {};
	if(req.body.bstock) {
		manifestOpts.bstock = req.body.bstock;
	}

	mandb.getManifestById(manifestId).then(async (manifest)=>{
		res.json({ status: 'submitted' });

		const manifestCsv = await buildManifestCsv(manifest.inventory, manifestOpts);

		const filename = path.join(manifestFilesPath, `${manifest.handle}${req.body.bstock? '-bstock': ''}-${manifest._id}.csv`);
		writeFile(filename, manifestCsv).then(()=>{__logger.info(`Manifest written to ${filename}`)});
	})
	.catch(err=>{
		__logger.error(err);
	});
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

function submit3pManifest(req,res) {
	const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  	manParse.parse(files.file.path, JSON.parse(fields.parseOpts)).then(blocks=>{
  		const manifest = {};
  		if(fields.liquidationSource) {
  			manifest.liquidationSource = fields.liquidationSource;
  		}
  		if(fields.purchasingSource) {
  			manifest.purchasingSource = fields.purchasingSource;
  		}
  		manifest.blocks = Object.entries(blocks).map( item => {
  			return { blockId: item[0], contents: item[1] }
  		});
			//TODO: handle other purchasing sources besides inmar
  		inmarDb.newManifest(manifest).then(newManifest=>{
				res.json(newManifest);  			
  		})
	  });
  });
}

module.exports = {
	listManifestFiles: listManifestFiles,
	generateManifestFile: generateManifestFile,
	downloadManifestFile: downloadManifestFile,
	submit3pManifest: submit3pManifest,
}