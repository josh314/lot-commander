// This module builds angularJS scripts from server-side data/code and sends them to the client.

const express = require('express');
const enums = require('../modules/enums');
const helpers = require('../helpers');

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes({ bstock, listings, quickLots }) {
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

  router.get(
    '/ng-app-server-code.js',
    ngAppServerFunctions
  );

  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/

  async function ngAppServerData( _req, res, _next ) {

    const dbEnums = {
      lotStatus: enums.lotStatus,
      lotType: enums.condition,
      marketplaces: enums.marketplace,
      packagingType: enums.packagingType,
      weightUnits: enums.weightUnits,
      lengthUnits: enums.lengthUnits,
    };

    const ngConstants = [
      { name: 'dbEnums', data: dbEnums },
{ name: 'listingsBoilerplate', data: listings.boilerplate },
      { name: 'bstockFormConstants', data: bstock.constants },
      { name: 'quickLotsBoilerplate', data: quickLots.boilerplate },
    ].reduce((s, item) => { return s + `app.constant('${item.name}', ${JSON.stringify(item.data)});`;}, '');

    res.send( `(function() { 'use strict'; var app = angular.module("myApp"); ${ngConstants} })();` );

  }

  async function ngAppServerFunctions( _req, res, _next ) {

    res.send(
      `
        (function() {
          const app = angular.module("myApp");

          app.factory('ServerCodeSvc', function() {
            return {
              setPackagingTypeFromShippingItems: ${ helpers.setPackagingTypeFromShippingItems.toString() }
            };
          });

        })();`
    );

  }


  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}