const path = require('path');

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));

const dbEnums = {
  lotStatus: lotdb.lotStatusEnum,
  lotType: lotdb.lotTypeEnum
}

function ngAppServerData() {
  return `(function() { 'use strict'; var app = angular.module("myApp"); app.constant('dbEnums', ${JSON.stringify(dbEnums)});})();`;
}

module.exports = {
	ngAppServerData: ngAppServerData,
} 