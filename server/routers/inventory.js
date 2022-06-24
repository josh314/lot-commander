const express = require('express');
const dayjs = require('dayjs');

const auth = require('../auth');


module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ inventoryCommander }) {
  const router = new express.Router();

  /******************************************
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
  router.get(
    '/purchases',
    // TODO: auth
    getPurchaseAggregation
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

  async function getPurchaseAggregation( req, res, _next ) {

    const options = {};

    if( req.query.start_date ) {
      options.startDate = dayjs( req.query.start_date ).startOf('day').toDate();
    }

    if( req.query.end_date ) {
      options.endDate = dayjs( req.query.end_date ).endOf('day').toDate();
    }

    const purchases = await inventoryCommander.aggregatePurchases( options );

    res.json( { purchases } );

  }


  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}