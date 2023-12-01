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

  if( 'is_fulfilled' in qp ) {
    fp.isFulfilled = !!parseInt(qp.is_fulfilled);
  }

  if( 'is_instantiated' in qp ) {
    fp.isInstantiated = !!parseInt(qp.is_instantiated);
  }


  if( 'include_virtual' in qp ) {
    fp.includeVirtual = !!parseInt( qp.include_virtual );
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
    '/:pkgId/is-instantiated',
    auth.isAuthorized( 'EDIT_PACKAGE' ),
    instantiatePackage
  );

  router.put(
    '/:pkgId/is-fulfilled',
    auth.isAuthorized( 'EDIT_PACKAGE' ),
    fulfillPackage
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
      const pkgData = req.body.packages;
      const { instantiate } = req.body;

      const { packages } = await inventoryCommander.createPackages( pkgData, instantiate );

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

  async function instantiatePackage( req, res, next ) {

    try {

      if( 'isInstantiated' in req.body && typeof req.body.isInstantiated === 'boolean' ) {

        const isInstantiated = req.body.isInstantiated;
        const pkgId = req.params.pkgId;

        if( isInstantiated ) {

          const { package: pkg } = await inventoryCommander.instantiatePackage( pkgId );

          if( pkg ) {
            eventsDb.instantiatePackage( { user: req.user, packageId: pkgId } );
          }

        }
        else {

          const { package: pkg } = await inventoryCommander.uninstantiatePackage( pkgId );

          if( pkg ) {
            eventsDb.uninstantiatePackage( { user: req.user, packageId: pkgId } );
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


  async function fulfillPackage( req, res, next ) {

    try {

      if( 'isFulfilled' in req.body && typeof req.body.isFulfilled === 'boolean' ) {

        const isFulfilled = req.body.isFulfilled;
        const pkgId = req.params.pkgId;

        const { pkg } = isFulfilled ? await inventoryCommander.fulfillPackage( pkgId ) : await inventoryCommander.unfulfillPackage( pkgId );

        res.json( { pkg } );

      }
      else {
        throw new InvalidRequestError();
      }

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