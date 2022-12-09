const express = require('express');

const auth = require('../auth');
const { ResourceNotFoundError } = require('../errors');

// Helpers

const cmpProductVariant = ( a, b ) => {

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

function routes({ eventsDb, inventoryCommander, listings, lotdb }) {
  const router = new express.Router();


  /*******************************************
   * Register route handlers
   * ======
   *
   ****/



  router.post(
    '/',
    auth.isAuthorized( 'SUBMIT_SHOPIFY_LISTING' ),
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
    '/shipping/rates',
    auth.isAuthorized( 'VIEW_STORE_SHIPPING_RATES' ),
    listShippingRates
  );
  router.post(
    '/shipping/rates',
    auth.isAuthorized( 'EDIT_STORE_SHIPPING_RATES' ),
    editShippingRates
  );

  router.get(
    '/shipping/rates/pallet-breakdown-service',
    auth.isAuthorized( 'VIEW_STORE_SHIPPING_RATES' ),
    getPalletBreakdownServiceRate
  );
  router.post(
    '/shipping/rates/pallet-breakdown-service',
    auth.isAuthorized( 'EDIT_STORE_SHIPPING_RATES' ),
    setPalletBreakdownServiceRate
  );

  router.delete(
    '/shipping/rates/:id',
    auth.isAuthorized( 'EDIT_STORE_SHIPPING_RATES' ),
    removeShippingRate
  );


  router.get(
    '/shipping/configurations',
    auth.isAuthorized( 'VIEW_STORE_SHIPPING_CONFIGURATIONS' ),
    listShippingConfigurations
  );

  router.get(
    '/shipping/configurations/:productVariantId',
    auth.isAuthorized( 'VIEW_STORE_SHIPPING_CONFIGURATIONS' ),
    getShippingConfiguration
  );

  router.post(
    '/shipping/configurations/:productVariantId',
    auth.isAuthorized( 'EDIT_STORE_SHIPPING_CONFIGURATIONS' ),
    setShippingConfiguration
  );

  router.delete(
    '/shipping/configurations/:productVariantId',
    auth.isAuthorized( 'EDIT_STORE_SHIPPING_CONFIGURATIONS' ),
    removeShippingConfiguration
  );


  router.get(
    '/products',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    listActiveProducts
  );

  router.get(
    '/product-variants',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    listActiveProductVariants
  );

  router.get(
    '/bundles',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    listProductBundles
  );

  router.get(
    '/bundles/:productVariantId',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    getProductBundle
  );

  router.post(
    '/bundles/:productVariantId',
    auth.isAuthorized( 'EDIT_STORE_CONTENT' ),
    setProductBundle
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

      // wait for submission to finish
      const submittedListingResponse = await respPromise;

      // for pallet lots, mark the corresponding pallet as broken down
      if( lot.pallet ) {

        const palletId = lot.pallet._id || lot.pallet;

        const { pallet } = await inventoryCommander.breakdownInventoryPallet( palletId );

        if( pallet ) {

          await eventsDb.breakdownInventoryPallet( { user: req.user, palletId } );

        }

      }

      // then update the lot
      await lotdb.editLot( submittedListingResponse.lot );

    }
    catch(e) {

      return next( e );

    }

  }

  async function listActiveProducts( req, res, next ) {

    try {

      const everydayBargainsOnly = req.query.everyday_bargains_only ? !!parseInt(req.query.everyday_bargains_only) : false;

      const products = await listings.shopify.shopifyGql.listActiveProducts( { everydayBargainsOnly } );

      res.json( { products } );

    }
    catch (e) {
      next( e );
    }

  }

  async function listActiveProductVariants( req, res, next ) {

    try {

      const everydayBargainsOnly = req.query.everyday_bargains_only ? !!parseInt(req.query.everyday_bargains_only) : false;

      const productVariants = await listings.shopify.shopifyGql.listActiveProductVariants( { everydayBargainsOnly } );

      res.json( { productVariants } );

    }
    catch (e) {
      next( e );
    }

  }


  /*******************************************
   * Shipping Rate Handlers
   * ======================
   *
   ****/

  async function listShippingRates( req, res, next ) {

    try {

      const includePallets = req.query.include_pallets ? !!parseInt(req.query.include_pallets) : false;

      // const rates = await shopifyGql['prod'].listProductVariantShippingRates( { includePallets } );
      const rates = await listings.shopify.shopifyGql.listProductVariantShippingRates( { includePallets } );
      rates.sort( cmpProductVariant );

      res.json( { rates } );

    }
    catch (e) {
      next( e );
    }

  }

  async function getPalletBreakdownServiceRate( req, res, next ) {

    try {

      const rate = await listings.shopify.shopifyGql.getPalletBreakdownServiceRate( );
      res.json( { rate } );

    }
    catch (e) {
      next( e );
    }

  }

  async function editShippingRates( req, res, next ) {

    const submittedRates = req.body.rates;

    try {

      const editPromises = submittedRates.filter( _ => _.id && typeof _.rate !== 'undefined' && _.rate !== null ).map( _ => listings.shopify.shopifyGql.setProductVariantShippingRate( _.id, _.rate ) );

      const rates = await Promise.all( editPromises );
      rates.sort( cmpProductVariant );

      res.json( { rates } );

    }
    catch (e) {
      next( e );
    }

  }

  async function setPalletBreakdownServiceRate( req, res, next ) {

    const newRate = req.body.rate;

    try {

      const { rate } = await listings.shopify.shopifyGql.setPalletBreakdownServiceRate( newRate );
      res.json( { rate } );

    }
    catch (e) {
      next( e );
    }

  }

  async function removeShippingRate( req, res, next ) {

    const productVariantGid = decodeURIComponent( req.params.id );

    try {

      const { success } = await listings.shopify.shopifyGql.removeProductVariantShippingRate( productVariantGid );

      res.json( { success } );

    }
    catch (e) {
      next( e );
    }

  }


  /*******************************************
   * Shipping Configuration Handlers
   * ===============================
   *
   ****/

  async function listShippingConfigurations( req, res, next ) {

    try {

      const includePallets = req.query.include_pallets ? !!parseInt(req.query.include_pallets) : false;
      const everydayBargainsOnly = req.query.everyday_bargains_only ? !!parseInt(req.query.everyday_bargains_only) : false;

      const configurations = await listings.shopify.shopifyGql.listProductVariantShippingConfigurations( { includePallets, everydayBargainsOnly } );
      configurations.sort( cmpProductVariant );

      res.json( { configurations } );

    }
    catch (e) {
      next( e );
    }

  }

  async function getShippingConfiguration( req, res, next ) {

    const productVariantGid = decodeURIComponent( req.params.productVariantId );

    try {

      const shippingConfiguration = await listings.shopify.shopifyGql.getProductVariantShippingConfiguration( productVariantGid );

      res.json( { shippingConfiguration } );

    }
    catch (e) {
      next( e );
    }

  }

  async function setShippingConfiguration( req, res, next ) {

    const debug = req.query.debug && !!parseInt( req.query.debug );
 
    const pvid = decodeURIComponent( req.params.productVariantId );

    const newShippingConfiguration = req.body.shippingConfiguration;

    try {

      const shippingConfiguration = await listings.shopify.shopifyGql.setProductVariantShippingConfiguration( pvid, newShippingConfiguration, { debug } );

      res.json( { shippingConfiguration } );
    }
    catch(e) {
      return next(e);
    }

  }

  async function removeShippingConfiguration( req, res, next ) {

    const productVariantGid = decodeURIComponent( req.params.productVariantId );

    try {

      const { success } = await listings.shopify.shopifyGql.removeProductVariantShippingConfiguration( productVariantGid );

      res.json( { success } );

    }
    catch (e) {
      next( e );
    }

  }

  /*******************************************
   * Product Bundle Handlers
   * =======================
   *
   ****/


  async function listProductBundles( _req, res, next ) {

    try {

      const bundles = await listings.shopify.shopifyGql.listProductVariantBundles(  );

      res.json( { bundles } );
    }
    catch(e) {
      return next(e);
    }

  }

  async function getProductBundle( req, res, next ) {

    const pvid = decodeURIComponent( req.params.productVariantId );

    try {

      const bundle = await listings.shopify.shopifyGql.getProductVariantBundle( pvid );

      res.json( { bundle } );
    }
    catch(e) {
      return next(e);
    }

  }

  async function setProductBundle( req, res, next ) {

    const debug = req.query.debug && !!parseInt( req.query.debug );
 
    const pvid = decodeURIComponent( req.params.productVariantId );

    const newBundle = req.body.bundle;

    try {

      const bundles = await listings.shopify.shopifyGql.setProductVariantBundle( pvid, newBundle, { debug } );

      res.json( { bundles } );
    }
    catch(e) {
      return next(e);
    }

  }

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}