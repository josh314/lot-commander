const express = require('express');

const auth = require('../auth');

module.exports = routes;

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

  // view bundle(s)
  router.get(
    '/',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    getAllContent
  );
  router.post(
    '/',
    auth.isAuthorized( 'EDIT_STORE_CONTENT' ),
    editContent
  );



  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/


  async function getAllContent( _req, res, next ) {

    try {
      const { metafields } = await shopifyGql.getShopMetafields( 'wsn_content' );

      res.json( { content: metafields } );
    }
    catch(e) {
      return next(e);
    }
  }

  async function editContent( req, res, next ) {

    const { content } = req.body;

    try {

      const newMetafield = Object.assign( content, { namespace: 'wsn_content' });

      const { metafields } = await shopifyGql.setShopMetafield( newMetafield );

      res.json( { metafields });

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