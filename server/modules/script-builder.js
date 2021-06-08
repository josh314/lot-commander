const path = require('path');

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const listings = require(path.join(__basedir, __config.modulesPath, 'listings'));
const bstock = require(path.join(__basedir, __config.modulesPath, 'bstock'));
const quickLots = require(path.join(__basedir, __config.modulesPath, 'quick-lots'));
const manifests = require('./manifests');

const dbEnums = {
  lotStatus: lotdb.lotStatusEnum,
  lotType: lotdb.lotTypeEnum,
  marketplaces: lotdb.marketplaceEnum,
  packagingType: lotdb.packagingTypeEnum,
  weightUnits: lotdb.weightUnitsEnum,
  lengthUnits: lotdb.lengthUnitsEnum,
};

const ngConstants = [
  { name: 'dbEnums', data: dbEnums },
  { name: 'listingsBoilerplate', data: listings.boilerplate },
  { name: 'bstockFormConstants', data: bstock.constants },
  { name: 'quickLotsBoilerplate', data: quickLots.boilerplate },
  { name: '__STANDARD_MANIFEST_COLUMNS__', data: manifests.__STANDARD_COLUMNS__ },
  { name: '__STANDARD_MANIFEST_BARCODE_COLUMN__', data: manifests.__STANDARD_BARCODE_COLUMN__ },
].reduce((s, item) => { return s + `app.constant('${item.name}', ${JSON.stringify(item.data)});`;}, '');


function ngAppServerData() {
  return `(function() { 'use strict'; var app = angular.module("myApp"); ${ngConstants} })();`;
}

module.exports = {
  ngAppServerData: ngAppServerData,
}; 