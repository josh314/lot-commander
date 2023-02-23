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

  // view pallet(s)
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

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}