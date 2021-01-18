const express = require('express');

const auth = require('../auth');
const helpers = require('../helpers');
const { InvalidRequestError } = require('../errors');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 * 
 *********/

const listBundlesFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle, 'i');
  }

  if( qp.package ) {
    fp.pkg = qp.package;
  }

  if( qp.is_packed ) {
    fp.isPacked = !!parseInt(qp.is_packed);
  }

  // TODO: category
  return fp;
};


/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ eventsDb, inventoryCommander }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  // view bundle(s)
  router.get(
    '/',
    auth.isAuthorized( 'VIEW_BUNDLE' ),
    listBundles
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_BUNDLE' ),
    countBundles
  );
  router.get(
    '/:bundleId',
    auth.isAuthorized( 'VIEW_BUNDLE' ),
    getBundleById
  );

  // Edit/create bundle
  router.post(
    '/create',
    auth.isAuthorized( 'CREATE_BUNDLE' ),
    createBundles
  );
  router.patch(
    '/:bundleId',
    auth.isAuthorized( 'EDIT_BUNDLE' ),
    editBundle
  );
  router.delete(
    '/:bundleId',
    auth.isAuthorized( 'EDIT_BUNDLE' ),
    deleteBundle
  );


  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/


  async function listBundles( req, res ) {

    const numPage = parseInt( req.query.num ) || 10;
    const page = parseInt( req.query.page ) || 1;
  
    const query = {
      // paging
      skip: ( page - 1 ) * numPage,
      num: numPage,

      // sorting
      sort: req.query.sort,
      sortDir: parseInt(req.query.sort_dir),

      // filters
      filterParams: listBundlesFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: helpers.populationPathsFromQuery( req.query )
    };

    const bundles = await inventoryCommander.listBundles(query);

    res.json( { bundles } );
  };

  async function countBundles( req, res ) {
  
    const count = await inventoryCommander.countBundles( listBundlesFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
  }

  async function createBundles( req, res, next  ) {

    try {
      const bundleData = req.body;

      const { bundles } = await inventoryCommander.createBundles( bundleData );

      if( bundles ) {

        for( let bundle of bundles ) {

          eventsDb.createBundle( { user: req.user, bundleId: bundle._id } );

        }

      }

      res.json( { bundles } );
    }
    catch(e) {

      return next( e );

    }

  }

  async function getBundleById( req, res, next ) {

    try {

      const bundleId = req.params.bundleId;
      const populate = helpers.populationPathsFromQuery( req.query );

      const bundle = await inventoryCommander.getBundleById( bundleId, { populate } );

      res.json( { bundle } );
    }
    catch(e) {
      return next( e );
    }

  };

  async function deleteBundle( req, res, next ) {

    try {

      const bundleId = req.params.bundleId;

      const { bundle } = await inventoryCommander.deleteBundle( bundleId );

      if( bundle ) {
        eventsDb.deleteBundle( { user: req.user, bundleId: bundle._id } );
      }

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  };

  async function editBundle( req, res, next ){

    try {

      const bundleId = req.params.bundleId;
      const editDocument = req.body;

      const { bundle, edits } = await inventoryCommander.editBundle( bundleId, editDocument );

      if( bundle ) {

        for( let edit of edits ) {

          const eventData = Object.assign(
            {
              user: req.user,
              bundleId: bundle._id,
            },
            edit
          )

          eventsDb.editBundle( eventData );

        }

      }

      res.json( { success: true } );

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