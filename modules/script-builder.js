const path = require('path');

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const listings = require(path.join(__basedir, __config.modulesPath, 'listings'));


const dbEnums = {
  lotStatus: lotdb.lotStatusEnum,
  lotType: lotdb.lotTypeEnum
}

const ngConstants = [
	{ name: 'dbEnums', data: dbEnums },
	{ name: 'listingsBoilerplate', data: listings.boilerplate}
].reduce((s, item) => { return s + `app.constant('${item.name}', ${JSON.stringify(item.data)});`}, '')


function ngAppServerData() {
  return `(function() { 'use strict'; var app = angular.module("myApp"); ${ngConstants} })();`;
}

module.exports = {
	ngAppServerData: ngAppServerData,
} 