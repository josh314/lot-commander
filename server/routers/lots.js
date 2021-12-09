const express = require('express');

const auth = require('../auth');

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ lotdb }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/


  // view pallet(s)
  // router.get(
  //   '/',
  //   auth.isAuthorized( 'VIEW_LOT' ),
  //   listLots
  // );
  // router.get(
  //   '/count',
  //   auth.isAuthorized( 'VIEW_LOT' ),
  //   countLots
  // );
  router.get(
    '/:lotId',
    auth.isAuthorized( 'VIEW_LOT' ),
    getLotById
  );

  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function getLotById( req, res, next ) {

    try {

      const lotId = req.params.lotId;

      lotdb.getLotById( lotId ).then( resp =>{
        res.json(resp);
      });

    }
    catch(e) {
      return next( e );
    }

  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}