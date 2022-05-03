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
      lotStatus: lotdb.enums.status,
      lotType: lotdb.enums.type,
      marketplaces: lotdb.enums.marketplace,
      packagingType: lotdb.enums.packagingType,
      weightUnits: lotdb.enums.weightUnits,
      lengthUnits: lotdb.enums.lengthUnits,
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