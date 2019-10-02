'use strict';

const path = require('path');

const libBarcodes = require('barcodes/lib');

if(!__config.productDataSrc) {
  throw new Error('No product data source!');
}

let mwsdbClient;
let upcItemDbClient;
let walmartOpenApiClient;

let getProductDataFromSrc;

let dataModule;

if( __config.productDataSrc.match(/mws/i) ) {
  const mwsdb = require(path.join(__config.libDir.mws, 'mwsdb'));
  mwsdbClient = new mwsdb.Client(__config.db.mwsdb);
  getProductDataFromSrc = getProductDataFromMwsdb;
}
else if( __config.productDataSrc.match(/upcitemdb/i) ) {
  const upcItemDbApi = require('upcitemdb/lib/api');
  const upcItemDbSettings = __config.upcItemDb;
  const connection = __connections['upcitemdb-cache'];
  if(connection) {
    upcItemDbSettings.cache = {
      connection: connection
    };
  }
  upcItemDbClient = new upcItemDbApi.Client(upcItemDbSettings);
  getProductDataFromSrc = getProductDataFromUpcItemDb;
  dataModule = require('upcitemdb/lib/data');
}
else if( __config.productDataSrc.match(/walmart/i) ) {
  const walmartOpenApi = require(path.join(__config.libDir.walmart, 'open-api'));
  walmartOpenApiClient = new walmartOpenApi.Client(__config.walmartOpenApi);
  getProductDataFromSrc = getProductDataFromWalmartOpenApi;
}
else {
  throw new Error('No product data source!');
}

//==========================================================
// Constants
//==========================================================

const MAX_UNIT_PRICE = 100;


//**********************************************************
// MWS data 
//**********************************************************

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

//*****************************************************
// UPC Item DB
//*****************************************************

async function getProductDataFromUpcItemDb(barcode) {
  let productData = {};

  let normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'upca');
  if(!normalizedBarcode) {
    normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'ean');
  }

  if(normalizedBarcode) {
    const resp = await upcItemDbClient.lookup(normalizedBarcode);
    if(resp && resp.item) {
      __logger.info(`Product data obtained from UpcItemDb for barcode ${normalizedBarcode}.`);
      productData = Object.assign(productData, dataModule.processItem(resp.item));
    }
    else {
      __logger.info(`No product data found in UpcItemDb for barcode ${normalizedBarcode}.`);
    }
    productData.normalizedBarcode = normalizedBarcode;
  }
  return productData;
}

//***************************************************
// Walmart Open Api
//***************************************************

async function getProductDataFromWalmartOpenApi(barcode){
  let productData = {};

  let normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'upca');
  if(!normalizedBarcode) {
    normalizedBarcode = libBarcodes.normalizeBarcodeByType(barcode, 'ean');
  }

  if(normalizedBarcode) {
    const apiResp = await walmartOpenApiClient.lookup(barcode);
    if(apiResp && apiResp.items && apiResp.items[0]) {
      __logger.info(`Product data obtained from Walmart Open API for barcode ${normalizedBarcode}.`);
      const item = apiResp.items[0];
      productData.title = item.name;
      productData.price = item.msrp ? item.msrp : (item.salePrice ? item.salePrice : 0);
      if( parseFloat(productData.price) > MAX_UNIT_PRICE ) {
        productData.price = 0;
      }
    }
    else {
      __logger.info(`No product data found in Walmart Open API for barcode ${normalizedBarcode}.`);
    }
    productData.normalizedBarcode = normalizedBarcode;
  }
  return productData;
}

/////////////////////////////////////////////////////

function randomPrice() {
  const max = 16;
  const min = 11;
  return Math.floor(Math.random() * (max - min) ) + min + 0.99;
}

function priceCheck(productData) {
  if(!productData.price) {
    productData.price = randomPrice();
  }
  return productData;
}

function getProductDataByBarcode(barcode) {
  return getProductDataFromSrc(barcode)
    .then(priceCheck);
}


module.exports = {
  getProductDataByBarcode: getProductDataByBarcode,
  getAsinsFromMwsApiForBarcode: getAsinsFromMwsApiForBarcode
};