const path = require('path');
const fs = require('fs');

const express = require('express');
const dayjs = require('dayjs');

const formidable = require('formidable');

const auth = require('../auth');
const helpers = require('../helpers');
const {
  ResourceNotFoundError
} = require('../errors');

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 *
 *********/

function listLotsFilterParamsFromQueryParams( qp ) {

  const fp = {};

  if( qp.startDate ) {
    fp.createdAt = qp.createdAt || {};
    fp.createdAt.$gte = dayjs( qp.startDate ).startOf('day').toDate();
  }
  if( qp.endDate ) {
    fp.createdAt = qp.createdAt || {};
    fp.createdAt.$lte = dayjs( qp.endDate ).endOf('day').toDate();
  }
  if( qp.status ) {
    fp.status = qp.status;
  }
  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') , 'i');
  }

  return fp;
}

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes({ inventoryCommander, lotdb, manifestSvc }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/


  // TODO: permissions

  // View lot data endpoints
  router.get(
    '/',
    auth.isAuthorized( 'LIST_LOTS' ),
    listLots
  );
  router.get(
    '/count',
    auth.isAuthorized( 'LIST_LOTS' ),
    countLots
  );
  router.get(
    '/by-handle/:handle',
    auth.isAuthorized( 'VIEW_LOT' ),
    getLotByHandle
  );
  router.get(
    '/:lotId',
    auth.isAuthorized( 'VIEW_LOT' ),
    getLotById
  );
  router.get(
    '/manifest/:manifestId',
    auth.isAuthorized( 'VIEW_LOT' ),
    getManifest
  );

  // Create, edit, delete
  router.post(
    '/',
    auth.isAuthorized( 'CREATE_LOT' ),
    createLot
  );
  router.delete(
    '/:lotId',
    auth.isAuthorized( 'DELETE_LOT' ),
    deleteLot
  );
  router.patch(
    '/:lotId',
    auth.isAuthorized( 'EDIT_LOT' ),
    editLot
  );
  router.post(
    '/:lotId/manifest/',
    auth.isAuthorized( 'EDIT_LOT' ),
    saveManifest
  );

  router.post(
    '/:lotId/primary-image/',
    auth.isAuthorized( 'EDIT_LOT' ),
    setPrimaryImage
  );
  router.post(
    '/:lotId/upload-manifest/:filename',
    auth.isAuthorized( 'EDIT_LOT' ),
    uploadManifest
  );
  router.post(
    '/:lotId/upload-manifest',
    auth.isAuthorized( 'EDIT_LOT' ),
    uploadManifest
  );

  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/

  async function listLots( req, res, next ) {

    try {

      const numPage = parseInt( req.query.num ) || 10;
      const page = parseInt( req.query.page ) || 1;

      const query = {
        // paging
        skip: ( page - 1 ) * numPage,
        num: numPage,

        // sorting
        sort: req.query.sort,
        sortDir: req.query.sort_dir ? parseInt(req.query.sort_dir) : undefined,

        // filters
        filterParams: listLotsFilterParamsFromQueryParams( req.query ),

      };

      const lots = await lotdb.listLots( query );

      res.json( { lots } );

    }
    catch (e) {
      next( e );
    }
  }

  async function countLots( req, res, next ) {

    try {

      const count = await lotdb.countLots( listLotsFilterParamsFromQueryParams( req.query ) );

      res.json({ count: count });

    }
    catch(e) {
      return next( e );
    }

  }

  async function getLotById( req, res, next ) {

    try {

      const lotId = req.params.lotId;
      const populate = helpers.populationPathsFromQuery( req.query );

      const lot = await lotdb.getLotById( lotId, { populate } );

      res.json( { lot } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function getLotByHandle( req, res, next  ) {

    try {
      const handle = req.params.handle;
      const populate = helpers.populationPathsFromQuery( req.query );

      let response;
      if( handle ) {
        const lot = await lotdb.getLotByHandle( handle, { populate } );
        response = { lot } ;
      }
      else {
        response = { error: 'No lot handle submitted.' };
      }
      res.json( response );
    }
    catch(e) {
      return next( e );
    }

  }


  async function getManifest( req, res, next ) {

    try {

      const manifestId = req.params.manifestId;
      const manifest = await mandb.getManifestById( manifestId );

      res.json({ manifest });

    }
    catch (e) {
      return next( e );
    }
  }

  async function createLot( req, res, next ) {

    try {

      const data = req.body;
      const lot = await lotdb.createLot( data );

      if( lot && data.pallet ) {

        await inventoryCommander.editInventoryPallet( data.pallet, { lot: lot._id } );

      }

      res.json({ lot });

    }
    catch (e) {
      return next( e );
    }

  }

  async function deleteLot( req, res, next ) {
    const lotId = req.params.lotId;

    try {

      const lot = await lotdb.deleteLot( lotId );
      // await imageServer.deleteLotImages( lotId );
      if( lot.pallet ) {
        await inventoryCommander.unlinkInventoryPalletLot( lot.pallet );
      }

      res.json( { success: true } );

    }
    catch (e) {
      return next( e );
    }
  }

  async function editLot( req, res, next ) {

    try {

      const _data = req.body;

      _data._id = req.params.lotId;

      const lot = await lotdb.editLot( _data );

      res.json( { lot } );

    }
    catch (e) {
      return next( e );
    }

  }

  async function saveManifest( req, res, next ) {

    try {

      // save inventory to manifest db
      // if successful, update lot db
      const lot = req.body.lot;
      const _data = {
        _id: lot.manifestId,
        handle: lot.handle,
        inventory: lot.inventory,
      };

      const manifest = await mandb.submitManifest( _data );

      if(manifest) {
        const lotUpdate = {
          _id: lot._id,
          totalUnits: lot.totalUnits ? lot.totalUnits : 0,
          manifestId: manifest._id,
        };
        await lotdb.editLot( lotUpdate );
      }

      res.json( { manifest } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function setPrimaryImage( req, res, next ) {

    try {
      const lot = await lotdb.setPrimaryImage( req.params.lotId, req.body.image );
      res.json( { lot } );
    }
    catch( e ) {
      return next( e );
    }

  }

  function uploadManifest( req, res, next ) {
    const lotId = req.params.lotId;
    const filename = req.params.filename;
    const form = new formidable.IncomingForm();
    form.parse( req, async function ( _err, _fields, files ) {
      try {
        const fileUploads = [];
        for(let [_, f] of Object.entries(files)){
          const readStream = fs.createReadStream(f.filepath);

          const lot = await lotdb.getLotById(lotId);

          if( !lot ) {
            throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
          }

          const s3Key = filename ? `${ lotId }/${ filename }` : `${ lotId }/${ lot.handle }${ path.extname(f.originalFilename)  }`;

          const storePromise = manifestSvc.put( readStream, s3Key , true).then(resp=>{
            if(resp && resp.data) {
              return lotdb.editLot({
                _id: lotId,
                manifestFileLocation: resp.data.Location
              });
            }
          })
            .then(_=>{
              console.log(`Unlinking temp file ${f.filepath}`);
              // TODO: check the unlinking!
              fs.promises.unlink( f.filepath );
              return _;
            });

          fileUploads.push( storePromise );

        }

        res.json( await Promise.all( fileUploads ) );

      }
      catch (e) {
        next(e);
      }
    });
  }

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}