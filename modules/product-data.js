const path = require('path');

const config = require(path.join(__basedir, 'config'));

const libBarcodes = require(path.join(config.libDir.barcodes, 'lib'));

const mwsdb = require(path.join(config.libDir.mws, 'mwsdb'));
const mwsdbClient = new mwsdb.Client(config.db.mwsdb);

// MWS data ////////////////////////////////////////////////

function getProductDataFromAsinData(asinData) {
	if(!asinData) return {};
	
	const productData = {
		title: asinData.productTitle,
		price: ''
	};
	if(asinData.price) {
		productData.price = parseFloat(asinData.price) / parseInt(asinData.packQuantity ? asinData.packQuantity : 1);
	}

	return productData;
}

async function getProductDataFromMwsdb(barcode) {
	if(barcode.length===8) {
		const newBarcode = libBarcodes.convertUpcE2A(barcode);
		barcode = newBarcode ? newBarcode : barcode;
	}
	let productData = {};
	let asinData = await mwsdbClient.getBestAsinDataForUpcNoFilter(barcode);
	if(asinData && asinData.price) {
		__logger.info(`Product data found in MWSDB for barcode ${barcode}.`);
		__logger.debug(JSON.stringify(asinData));
		productData = getProductDataFromAsinData(asinData);
	}
	else {
		__logger.info(`Requesting data from MWS API for barcode ${barcode}.`);
		const refreshResp = await mwsdbClient.refreshBarcodeFromMws(barcode);
		__logger.debug(JSON.stringify(refreshResp));
		if(!refreshResp.error) {
			__logger.info(`Product data refreshed from MWS API for barcode ${barcode}.`);
			asinData = await mwsdbClient.getBestAsinDataForUpcNoFilter(barcode);
			productData = getProductDataFromAsinData(asinData);
		}
		else {
			__logger.info(`No product data found in MWS API for barcode ${barcode}`);
		}
	}
	return productData;
}

/////////////////////////////////////////////////////

function titleCheck(productData) {
	if(!productData.title) {
		productData.title = 'UNKNOWN';
	}
	return productData;
}

function randomPrice() {
	const max = 16;
	const min = 11;
	return Math.floor(Math.random() * (max - min) ) + min + 0.99;
}

function priceCheck(productData) {
	if(!productData.price) {
		productData.price = randomPrice();
	}
	else {
		productData.price = 2*productData.price;
	}
	return productData;
}

function getProductDataByBarcode(barcode) {
	return getProductDataFromMwsdb(barcode)
						.then(titleCheck)
						.then(priceCheck);
}


module.exports = {
	getProductDataByBarcode: getProductDataByBarcode,
}