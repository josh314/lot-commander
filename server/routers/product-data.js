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
    '/queue',
    queueProductDataFetching
  );

  /*******************************************
   * Define Handlers & Middleware
   * ===============
   *
   ****/

  async function getProductDataByBarcode( req, res, _next ) {

    const barcode = req.params.barcode;

    const product = await productData.getProductDataByBarcode( barcode );

    res.json( { product } );

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

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}