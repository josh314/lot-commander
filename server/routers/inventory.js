const express = require('express');

const auth = require('../auth');

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ inventoryCommander }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get(
    '/pallets',
    auth.isAuthorized( 'VIEW_RECEIVED_PALLET' ),
    aggregateInventoryPallets
  );
  router.get(
    '/packages',
    auth.isAuthorized( 'VIEW_PACKAGE' ),
    getPackageInventory
  );
  router.get(
    '/bundles',
    auth.isAuthorized( 'VIEW_BUNDLE' ),
    getBundleInventory
  );


  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/


  async function aggregateInventoryPallets( req, res, _next ) {

    const options = {};

    if( req.query.date ) {
      options.date = new Date( req.query.date );
    }

    const inventory = await inventoryCommander.aggregateInventoryPallets( options );

    res.json( { inventory } );
  }

  async function getPackageInventory( req, res, _next ) {

    const options = {};

    if( req.query.date ) {
      options.date = new Date( req.query.date );
    }

    const inventory = await inventoryCommander.getPackageInventory( options );

    res.json( { inventory } );
  }

  async function getBundleInventory( req, res, _next ) {

    const options = {};

    if( req.query.date ) {
      options.date = new Date( req.query.date );
    }

    const inventory = await inventoryCommander.getBundleInventory( options );

    res.json( { inventory } );
  }


  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}