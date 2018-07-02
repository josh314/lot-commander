const path = require('path');


const libBarcodes = require(path.join(__config.libDir.barcodes, 'lib'));

const mwsdb = require(path.join(__config.libDir.mws, 'mwsdb'));
const mwsdbClient = new mwsdb.Client(__config.db.mwsdb);

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
	let productData = {};

	let normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'upca');
	if(!normalizedBarcode) {
		normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'ean');
	}

	if(normalizedBarcode) {
		let asinData = await mwsdbClient.getBestAsinDataForUpcNoFilter(normalizedBarcode);
		if(asinData && asinData.price) {
			__logger.info(`Product data found in MWSDB for barcode ${normalizedBarcode}.`);
			__logger.debug(JSON.stringify(asinData));
			productData = getProductDataFromAsinData(asinData);
		}
		else {
			__logger.info(`Requesting data from MWS API for barcode ${normalizedBarcode}.`);
			const refreshResp = await mwsdbClient.refreshBarcodeFromMws(normalizedBarcode);
			__logger.debug(JSON.stringify(refreshResp));
			if(!refreshResp.error) {
				__logger.info(`Product data refreshed from MWS API for barcode ${normalizedBarcode}.`);
				asinData = await mwsdbClient.getBestAsinDataForUpcNoFilter(normalizedBarcode);
				productData = getProductDataFromAsinData(asinData);
			}
			else {
				__logger.info(`No product data found in MWS API for barcode ${normalizedBarcode}`);
			}
		}
		productData.normalizedBarcode = normalizedBarcode;
	}
	return productData;
}

async function getAsinsFromMwsApiForBarcode(barcode) {
	const asins = [];

	let normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'upca');
	if(!normalizedBarcode) {
		normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'ean');
	}

	if(normalizedBarcode) {
		let asinData;

		__logger.info(`Requesting data from MWS API for barcode ${normalizedBarcode}.`);
		const refreshResp = await mwsdbClient.refreshBarcodeFromMws(normalizedBarcode);
		if(!refreshResp.error) {
			__logger.info(`Product data refreshed from MWS API for barcode ${normalizedBarcode}.`);
			for( let elem of refreshResp ) {
				if(elem.asin) {
					asins.push(elem.asin);
				}
			}
		}
		else {
			__logger.info(`No product data found in MWS API for barcode ${normalizedBarcode}`);
		}
	}
	return asins;
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
						// .then(titleCheck)
						.then(priceCheck);
}


module.exports = {
	getProductDataByBarcode: getProductDataByBarcode,
	getAsinsFromMwsApiForBarcode: getAsinsFromMwsApiForBarcode
}