const express = require('express');

const auth = require('../../auth');

module.exports = routes;

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

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ shopifyGql }) {
  const router = new express.Router();
  
  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get(
    '/',
    auth.isAuthorized( 'VIEW_STORE_SHIPPING_RATES' ),
    getStoreShippingRates
  );
  router.post(
    '/',
    auth.isAuthorized( 'EDIT_STORE_SHIPPING_RATES' ),
    editStoreShippingRates
  );



  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function getStoreShippingRates( req, res, next ) {

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

  async function editStoreShippingRates( req, res, next ) {

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