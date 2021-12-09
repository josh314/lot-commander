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

const listPackagesFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle, 'i');
  }

  if( qp.type ) {
    fp.types = qp.type.split(',').map( _ => new RegExp( `^${_}`, 'i') );
  }

  if( qp.units ) {
    fp.units = parseInt(qp.units);
  }

  if( 'finished' in qp ) {
    fp.isFinished = !!parseInt( qp.finished );
  }

  if( 'shipped' in qp ) {
    fp.isShipped = !!parseInt( qp.shipped );
  }

  return fp;
};

function routes( { eventsDb, inventoryCommander } ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  
  router.get(
    '/',
    auth.isAuthorized( 'VIEW_PACKAGE' ),
    listPackages
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_PACKAGE' ),
    countPackages
  );
  router.get(
    '/:pkgId',
    auth.isAuthorized( 'VIEW_PACKAGE' ),
    getPackageById
  );
  router.post(
    '/',
    auth.isAuthorized( 'CREATE_PACKAGE' ),
    createPackages
  );
  router.delete(
    '/:pkgId',
    auth.isAuthorized( 'EDIT_PACKAGE' ),
    deletePackage
  );

  router.patch(
    '/:pkgId',
    auth.isAuthorized( 'EDIT_PACKAGE' ),
    editPackage
  );
  router.put(
    '/:pkgId/is-finished',
    auth.isAuthorized( 'EDIT_PACKAGE' ),
    finishPackage
  );
  router.post(
    '/:pkgId/pallets',
    auth.isAuthorized( 'EDIT_PACKAGE' ),
    addPalletsToPackage
  );
  router.post(
    '/:pkgId/bundles',
    auth.isAuthorized( 'EDIT_PACKAGE' ),
    addBundlesToPackage
  );

  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/


  async function listPackages( req, res ) {

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
      filterParams: listPackagesFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: helpers.populationPathsFromQuery( req.query )
    };

    const packages = await inventoryCommander.listPackages(query);

    res.json( { packages } );
  }
 
  async function countPackages( req, res ) {
  
    const count = await inventoryCommander.countPackages( listPackagesFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
  }

  async function getPackageById( req, res, next ) {

    try {

      const pkgId = req.params.pkgId;
      const populate = helpers.populationPathsFromQuery( req.query );

      const pkg = await inventoryCommander.getPackageById( pkgId, { populate } );

      res.json( { package: pkg } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function createPackages( req, res, next  ) {

    try {
      const pkgData = req.body;

      const { packages } = await inventoryCommander.createPackages( pkgData );

      if( packages ) {

        for( let pkg of packages ) {
          eventsDb.createPackage( { user: req.user, packageId: pkg._id } );
        }

      }

      res.json( { packages: packages } );
    }
    catch(e) {

      return next( e );

    }

  }

  async function deletePackage( req, res, next ) {

    try {

      const pkgId = req.params.pkgId;

      const { package: pkg } = await inventoryCommander.deletePackage( pkgId );

      if( pkg ) {
        eventsDb.deletePackage( { user: req.user, packageId: pkg._id } );
      }

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function editPackage( req, res, next ) {

    try {

      const pkgId = req.params.pkgId;
      const pkgData = req.body;

      const { package: pkg, edits } = await inventoryCommander.editPackage( pkgId, pkgData );

      if( pkg ) {

        for( let edit of edits ) {

          const eventData = Object.assign(
            {
              user: req.user,
              packageId: pkg._id,
            },
            edit
          );

          eventsDb.editPackage( eventData );

        }

      }

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function finishPackage( req, res, next ) {

    try {

      if( 'isFinished' in req.body && typeof req.body.isFinished === 'boolean' ) {

        const isFinished = req.body.isFinished;
        const pkgId = req.params.pkgId;
        
        if( isFinished ) {

          const { package: pkg } = await inventoryCommander.finishPackage( pkgId );

          if( pkg ) {
            eventsDb.finishPackage( { user: req.user, packageId: pkgId } );
          }

        }
        else {

          const { package: pkg } = await inventoryCommander.reopenPackage( pkgId );

          if( pkg ) {
            eventsDb.reopenPackage( { user: req.user, packageId: pkgId } );
          }

        }

        res.json( { success: true } );

      }
      else {
        throw new InvalidRequestError();
      }

    }
    catch(e) {
      return next( e );
    }

  }

  async function addPalletsToPackage( req, res, next ) {

    try {

      const pkgId = req.params.pkgId;
      const pallets = req.body;

      for( let palletId of pallets ) {

        const { package: pkg, pallet } = await inventoryCommander.addPackageInventoryPallet( pkgId, palletId );

        if( pkg && pallet ) {
          eventsDb.addPackageInventoryPallet( { user: req.user, packageId: pkgId, palletId } );
        }

      }

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  }
  
  async function addBundlesToPackage( req, res, next ) {

    try {

      const pkgId = req.params.pkgId;
      const bundles = req.body;

      for( let bundleId of bundles ) {

        const { package: pkg, bundle } = await inventoryCommander.packBundle( bundleId, pkgId );

        if( pkg && bundle ) {
          eventsDb.packBundle( { user: req.user, bundleId, packageId: pkgId } );
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