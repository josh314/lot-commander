const express = require('express');

const auth = require('../auth');
const { ResourceNotFoundError } = require('../errors');

// Helpers

const cmpRate = ( a, b ) => {

  if( a.productTitle < b.productTitle ) {
    return -1;
  }
  else if( a.productTitle > b.productTitle ) {
    return +1;
  }
  else {

    const aVariantTitleNumber = parseFloat( a.variantTitle );
    const bVariantTitleNumber = parseFloat( b.variantTitle );

    if( Number.isNaN( aVariantTitleNumber ) || Number.isNaN( bVariantTitleNumber ) ) {

      return a.variantTitle < b.variantTitle ? -1 : 1;

    }
    else {

      return aVariantTitleNumber - bVariantTitleNumber;

    }

  }

};

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ listings, lotdb, shopifyGql }) {
  const router = new express.Router();


  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/


  
  router.post(
    '/',
    express.json(),
    ( req, res, next ) => {
      const marketplace = req.body.listing.marketplace;
      if( marketplace === 'wholesaleninjas' ) {
        auth.isAuthorized('SUBMIT_SHOPIFY_LISTING')(req,res,next);
      }
      else if ( marketplace === 'bstock' ) {
        auth.isAuthorized('SUBMIT_AUCTION')(req,res,next);
      }
      else {
        throw new Error(`Marketplace '${marketplace}' not recognized.`);
      }
    },
    submit
  );


  router.get(
    '/shipping-rates',
    auth.isAuthorized( 'VIEW_STORE_SHIPPING_RATES' ),
    getShippingRates
  );
  router.post(
    '/shipping-rates',
    auth.isAuthorized( 'EDIT_STORE_SHIPPING_RATES' ),
    editShippingRates
  );



  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function submit( req, res, next ) {

    try {
      const lotId = req.body.lotId;
      const listing = req.body.listing;
      const publish = !!req.body.publish;

      const lot = await lotdb.getLotById( lotId );
      if( !lotId || !lot ) {
        console.error('No listing submitted: invalid or missing lotId.');
        const e = new ResourceNotFoundError( { name: 'lot', id: lotId } );
        throw e;
      }
      listing.lot = lot;
    
      const respPromise = listings.submit( { lotId, listing, publish } );

      // Submission takes a while so don't wait
      res.json({ message: 'Listing submitted. Submission may take several minutes.'});

      // wait for submission to finish then update the lot
      const submittedListingResponse = await respPromise;
      lotdb.updateLot( submittedListingResponse.lot );
    }
    catch(e) {

      return next( e );

    }
  
  }


  async function getShippingRates( req, res, next ) {

    try {

      const includePallets = req.query.include_pallets ? !!parseInt(req.query.include_pallets) : false;

      const rates = await shopifyGql.listProductVariantShippingRates( { includePallets } );
      rates.sort( cmpRate );

      res.json( { rates } );
      
    }
    catch (e) {
      next( e );
    }

  }

  async function editShippingRates( req, res, next ) {

    const submittedRates = req.body.rates;

    try {

      const editPromises = submittedRates.filter( _ => _.id && typeof _.rate !== 'undefined' && _.rate !== null ).map( _ => shopifyGql.setProductVariantShippingRate( _.id, _.rate ) );
      
      const rates = await Promise.all( editPromises );
      rates.sort( cmpRate );

      res.json( { rates } );

    }
    catch (e) {
      next( e );
    }

  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}