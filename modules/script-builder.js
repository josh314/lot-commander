const path = require('path');

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
// const inmardb = require(path.join(__basedir, __config.modulesPath, 'inmar-db'));
const listings = require(path.join(__basedir, __config.modulesPath, 'listings'));
const bstock = require(path.join(__basedir, __config.modulesPath, 'bstock'));
const quickLots = require(path.join(__basedir, __config.modulesPath, 'quick-lots'));

const dbEnums = {
  lotStatus: lotdb.lotStatusEnum,
  lotType: lotdb.lotTypeEnum,
  marketplaces: lotdb.marketplaceEnum,
  packagingType: lotdb.packagingTypeEnum,
  weightUnits: lotdb.weightUnitsEnum,
  lengthUnits: lotdb.lengthUnitsEnum,
  // priceType: inmardb.priceTypeEnum,
};

const ngConstants = [
  { name: 'dbEnums', data: dbEnums },
  { name: 'listingsBoilerplate', data: listings.boilerplate },
  { name: 'bstockFormConstants', data: bstock.constants },
  { name: 'quickLotsBoilerplate', data: quickLots.boilerplate },
].reduce((s, item) => { return s + `app.constant('${item.name}', ${JSON.stringify(item.data)});`;}, '');


function ngAppServerData() {
  return `(function() { 'use strict'; var app = angular.module("myApp"); ${ngConstants} })();`;
}

module.exports = {
  ngAppServerData: ngAppServerData,
}; 