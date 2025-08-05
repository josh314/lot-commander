const express = require('express');

module.exports = routes;



/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes( { productData } ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.get(
    '/:barcode',
    getProductDataByBarcode
  );
  router.post(
    '/bulk-get',
    bulkGetProductDataByBarcode
  );
  router.post(
    '/queue',
    queueProductDataFetching
  );

  // endpoints for internal data
  router.get(
    '/internal/:barcode',
    getInternalProductDataByBarcode
  );
  router.post(
    '/internal',
    saveInternalProductData
  );

  router.get(
    '/fallback/:barcode',
    getFallbackDataForBarcode
  );
  router.post(
    '/fallback/bulk-get',
    bulkGetFallbackData
  );


  /*******************************************
   * Define Handlers & Middleware
   * ===============
   *
   ****/

  async function getProductDataByBarcode( req, res, next ) {

    try {

      const barcode = req.params.barcode;

      const product = await productData.getProductDataByBarcode( barcode );

      res.json( { product } );

    }
    catch(e) {
      next( e );
    }

  }

  async function queueProductDataFetching( req, res, next ) {

    try {
      const barcodes = req.body.barcodes;

      await productData.queueProductDataFetching( barcodes );

      res.json( { success: true } );

    }
    catch(e) {
      next( e );
    }

  }


  async function bulkGetProductDataByBarcode( req, res, next ) {

    try {
      const barcodes = req.body.barcodes;

      const products = await productData.bulkGetProductData( barcodes );

      res.json( { products } );

    }
    catch(e) {
      next( e );
    }

  }

  async function getInternalProductDataByBarcode( req, res, next ) {

    try {
      const barcode = req.params.barcode;

      const product = await productData.getInternalProductData( barcode );

      res.json( { product } );

    }
    catch(e) {
      next( e );
    }

  }

  async function saveInternalProductData( req, res, next ) {

    try {
      const { productData: data } = req.body;

      const response = await productData.saveInternalProductData( data );

      res.json( response );

    }
    catch(e) {
      next( e );
    }

  }

  async function getFallbackDataForBarcode( req, res, next ) {

    try {
      const barcode = req.params.barcode;

      const product = await productData.getFallbackData( barcode );

      res.json( { product } );

    }
    catch(e) {
      next( e );
    }

  }

  async function bulkGetFallbackData( req, res, next ) {

    try {
      const barcodes = req.body.barcodes;

      const products = await productData.bulkGetFallbackData( barcodes );

      res.json( { products } );

    }
    catch(e) {
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