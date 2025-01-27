const path = require('path');
const fs = require('fs');

const express = require('express');
const dayjs = require('dayjs');
const axios = require('axios');

const formidable = require('formidable');

const auth = require('../auth');
const helpers = require('../helpers');
const collage = require('../modules/collage');
const {
  ChildResourceNotFoundError,
  ResourceNotFoundError
} = require('../errors');

const manifestSvc = require(path.join(__basedir, __config.modulesPath, 'manifest-svc'));

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
  if( qp.lotNumber ) {
    fp.lotNumber = qp.lotNumber;
  }

  return fp;
}

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes({ inventoryCommander, lotdb, manifests }) {
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
  router.get(
    '/:lotId/manifest-file',
    auth.isAuthorized( 'VIEW_LOT' ),
    getManifestFile
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
    '/:lotId/images/',
    auth.isAuthorized( 'EDIT_LOT' ),
    addImages
  );
  router.post(
    '/:lotId/images/render-collage',
    renderCollage
  );
  router.post(
    '/:lotId/upload-manifest/:filename',
    auth.isAuthorized( 'EDIT_LOT' ),
    uploadManifest
  );
  router.get(
    '/:lotId/:mediaType/:mediaId',
    auth.isAuthorized( 'VIEW_LOT' ),
    getLotMedia
  );
  router.post(
    '/:lotId/:mediaType/:mediaId/primary',
    auth.isAuthorized( 'EDIT_LOT' ),
    setPrimaryMedia
  );
  router.post(
    '/:lotId/upload-manifest',
    auth.isAuthorized( 'EDIT_LOT' ),
    uploadManifest
  );

  router.put(
    '/:lotId/lot-number',
    auth.isAuthorized( 'EDIT_LOT' ),
    generateLotNumber
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
      const manifest = await manifests.getManifestById( manifestId );

      res.json({ manifest });

    }
    catch (e) {
      return next( e );
    }
  }

  async function getManifestFile( req, res, next ) {

    try {

      const { lotId } = req.params;

      const lot = await lotdb.getLotById( lotId );

      if( lot ) {

        if( lot.manifestFileLocation ) {

          const resp = await axios({
            method: 'get',
            url: lot.manifestFileLocation,
            responseType: 'stream'
          });

          resp.data.pipe( res );

        }
        else {

          throw new ChildResourceNotFoundError( {
            parentType: 'lot',
            parentId: lotId,
            childType: 'manifestFileLocation',
            childId: lot.manifestFileLocation
          } );

        }

      }
      else {

        throw new ResourceNotFoundError( { type: 'lot', id: lotId } );

      }

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

      const { lotId } = req.params;

      const lot = await lotdb.editLot( lotId, req.body );

      res.json( { lot } );

    }
    catch (e) {
      return next( e );
    }

  }

  async function saveManifest( req, res, next ) {

    try {

      const { lotId } = req.params;
      const lot = await lotdb.getLotById( lotId );

      if( lot ) {

        const { inventory } = req.body;

        const _data = {
          _id: lot.manifestId,
          handle: lot.handle,
          inventory,
        };

        const manifest = await manifests.saveManifest( _data );

        if(manifest) {

          const totalUnits = inventory.reduce( ( total, inventoryItem ) => total + ( parseInt( inventoryItem.quantity ) || 0 ), 0 );
          const estimatedRetailValue = inventory.reduce( ( total, inventoryItem ) => total + ( parseFloat( inventoryItem.price )*parseInt( inventoryItem.quantity ) || 0 ), 0 );

          const lotUpdate = {
            _id: lot._id,
            totalUnits,
            estimatedRetailValue,
            manifestId: manifest._id,
          };
          await lotdb.editLot( lot._id, lotUpdate );

        }

        res.json( { manifest } );

      }
      else {

        throw new ResourceNotFoundError( { type: 'lot', id: lotId } );

      }

    }
    catch(e) {
      return next( e );
    }

  }

  async function getLotMedia( req, res, next ) {

    try {

      const { lotId, mediaId, mediaType } = req.params;

      const lot = await lotdb.getLotById( lotId );
      const media = lot.getMedia( mediaId, mediaType );

      res.json( { media } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function setPrimaryMedia( req, res, next ) {

    try {

      const { lotId, mediaType, mediaId } = req.params;

      const lot = await lotdb.setPrimaryMedia( lotId, mediaId, mediaType );
      res.json( { lot } );
    }
    catch( e ) {
      return next( e );
    }

  }

  async function uploadManifest( req, res, next ) {

    try {

      const lotId = req.params.lotId;
      const filename = req.params.filename;
      const form = new formidable.IncomingForm();

      const [ _, files ] = await form.parse( req );

      const fileUploads = [];

      for( let [ _, fileArray ] of Object.entries(files) ){

        const f = fileArray[0];

        const readStream = fs.createReadStream(f.filepath);

        const lot = await lotdb.getLotById(lotId);

        if( !lot ) {
          throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
        }

        const s3Key = filename ? `${ lotId }/${ filename }` : `${ lotId }/${ lot.handle }${ path.extname(f.originalFilename)  }`;

        const storePromise = manifestSvc.put( readStream, s3Key , true).then( resp => {

          if( resp && resp.Location ) {
            return lotdb.editLot(
              lotId,
              {
                manifestFileLocation: resp.Location
              }
            );
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
    catch(e) {
      return next(e);
    }

  }

  // Note that this doesn't save actual images to any host, just adds the image data to the lot
  // See the /api/media endpoints for image storage
  async function addImages( req, res, next ) {

    try {

      const lotId = req.params.lotId;
      const { images } = req.body;

      const { lot, media } = await lotdb.addMedia( lotId, images, 'images' );

      res.json( { lot, media } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function generateLotNumber( req, res, next ) {

    try {

      const lotId = req.params.lotId;

      const lot = await lotdb.generateLotNumber( lotId );

      res.json( { lot } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function renderCollage( req, res, next ) {

    try {

      const { lotId } = req.params;

      const lot = await lotdb.getLotById( lotId );

      if( !lot ) {
        throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
      }

      const manifestItems = await manifests.getManifestItemsForLot( lot );

      let imageUrls = [];
      if( manifestItems && manifestItems.length ) {

        imageUrls = manifestItems.filter(_item => Array.isArray( _item.Image ) ).map( _item => _item.Image[ helpers.getRandomArrayIndex( _item.Image ) ] ).filter( _ => _ );

      }
      else {

        throw new ChildResourceNotFoundError( {
          parentType: 'lot',
          parentId: lotId,
          childType: 'manifest',
        } );

      }

      const { image } = await collage.createCollageFromProductImageList( imageUrls, { randomize: true } );

      res.json({ image });

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