const express = require('express');

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ bstock, listings, lotdb, quickLots }) {
  const router = new express.Router();


  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get(
    '/ng-app-server-data.js',
    ngAppServerData
  );

  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function ngAppServerData( _req, res, _next ) {

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
    ].reduce((s, item) => { return s + `app.constant('${item.name}', ${JSON.stringify(item.data)});`;}, '');

    res.send( `(function() { 'use strict'; var app = angular.module("myApp"); ${ngConstants} })();` );
  
  }


  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}