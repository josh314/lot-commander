const express = require('express');

const auth = require('../auth');
const helpers = require('../helpers');
const { InvalidRequestError } = require('../errors');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 * 
 *********/

const listPalletsFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle, 'i');
  }

  if( qp.shipment ) {
    fp.shipment = qp.shipment;
  }

  if( qp.has_problem ) {
    fp.hasProblem = !!parseInt(qp.has_problem);
  }

  if( qp.is_brokendown ) {
    fp.isBrokendown = !!parseInt(qp.is_brokendown);
  }

  if( qp.is_anonymous ) {
    fp.isAnonymous = !!parseInt(qp.is_anonymous);
  }

  // TODO: category
  return fp;
};


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
    getReceivedPalletInventory
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


  async function getReceivedPalletInventory( req, res, next ) {

    const options = {};

    if( req.query.date ) {
      options.date = new Date( req.query.date );
    }

    const inventory = await inventoryCommander.getReceivedPalletInventory( options );

    res.json( { inventory } );
  };

  async function getPackageInventory( req, res, next ) {

    const options = {};

    if( req.query.date ) {
      options.date = new Date( req.query.date );
    }

    const inventory = await inventoryCommander.getPackageInventory( options );

    res.json( { inventory } );
  };

  async function getBundleInventory( req, res, next ) {

    const options = {};

    if( req.query.date ) {
      options.date = new Date( req.query.date );
    }

    const inventory = await inventoryCommander.getBundleInventory( options );

    res.json( { inventory } );
  };


  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}