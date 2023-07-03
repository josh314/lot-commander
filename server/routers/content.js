const express = require('express');

const auth = require('../auth');

module.exports = routes;

const getClientEnvStr = req => {
  if( req.query.env && (req.query.env === 'prod' || req.query.env === 'staging') ) {
    return req.query.env;
  }
  else {
    return 'staging';
  }
};

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes({ shopifyGql, storeMetafieldSchemaDb }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.get(
    '/',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    getAllContent
  );
  router.get(
    '/schema',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    getStoreContentSchema
  );
  router.get(
    '/:id',
    auth.isAuthorized( 'VIEW_STORE_CONTENT' ),
    getContent
  );

  router.post(
    '/',
    auth.isAuthorized( 'EDIT_STORE_CONTENT' ),
    editContent
  );
  router.delete(
    '/:id',
    auth.isAuthorized( 'DELETE_STORE_CONTENT' ),
    deleteContent
  );

  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/

  async function getContent( req, res, next ) {

    try {

      const env = getClientEnvStr( req );

      const gid = decodeURIComponent( req.params.id );

      const { metafield } = await shopifyGql[ env ].getMetafield( gid );

      res.json( { content: metafield } );
    }
    catch(e) {
      return next(e);
    }

  }

  async function getStoreContentSchema( req, res, next ) {

    try {

      const numPage = parseInt( req.query.num ) || 250;
      const page = parseInt( req.query.page ) || 1;

      const query = {
        // paging
        skip: ( page - 1 ) * numPage,
        num: numPage,

        // filters
        filterParams: { namespace: 'wsn_content' },

      };

      const schema = await storeMetafieldSchemaDb.listStoreMetafieldSchema( query );

      res.json( { schema } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function getAllContent( req, res, next ) {

    try {

      const env = getClientEnvStr( req );

      const { metafields } = await shopifyGql[ env ].getShopMetafields( 'wsn_content' );

      res.json( { content: metafields } );
    }
    catch(e) {
      return next(e);
    }
  }

  async function editContent( req, res, next ) {

    const { content } = req.body;

    try {

      const env = getClientEnvStr( req );

      const newMetafield = Object.assign( content, { namespace: 'wsn_content' });

      const { metafields } = await shopifyGql[ env ].setShopMetafield( newMetafield );

      res.json( { metafields });

    }
    catch (e) {
      next( e );
    }

  }

  async function deleteContent( req, res, next ) {

    try {

      const env = getClientEnvStr( req );

      const gid = decodeURIComponent( req.params.id );

      const { deletedId } = await shopifyGql[ env ].deleteMetafield( gid );

      res.json( { deletedId } );
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