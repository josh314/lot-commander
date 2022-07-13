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

  // This is expecting a pretty rigid request body:
  // {
  //   "content" : [
  //     {
  //       namespace: "namespace",
  //       key: "key",
  //       value: "value",
  //       type: "type" // See possible types at https://shopify.dev/apps/metafields/types
  //     }
  //   ]
  // }
  async function editContent( req, res, next ) {

    const { content } = req.body;

    try {

      const editPromises = content.map( c => Object.assign( c, { namespace: 'wsn_content' }) ).map( shopifyGql.setShopMetafield.bind( shopifyGql ) );
      
      const response = await Promise.all( editPromises );

      res.json( { response } );

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