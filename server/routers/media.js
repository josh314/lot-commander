const fs = require('fs');
const path = require('path');

const express = require('express');
const formidable = require('formidable');
const axios = require('axios');

const {
  ExternalMediaNotFoundError,
  InvalidRequestError,
  IllegalActionError
} = require('../errors');

const mediaServer = require( '../modules/media-server' );

const notFoundImage = fs.readFileSync(path.join(__basedir, '../assets', 'missing-image.jpg'));

module.exports = routes;

function routes( { inventoryCommander, lotdb } ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.get(
    '/',
    get
  );
  router.post(
    '/:mediaType/upload',
    upload
  );
  router.post(
    '/:mediaType/remove',
    remove
  );
  // router.post(
  //   '/replace',
  //   replaceMedia
  // );
  router.get(
    '/images/list',
    listImages
  );
  router.post(
    '/images/clone',
    cloneImages
  );
  router.get(
    '/proxy',
    proxy
  );


  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/

  async function get( req, res, next ) {

    try {

      const s3Location = decodeURIComponent( req.query.s3 );
      const resp = await mediaServer.get( { s3Location: s3Location } );
      if( resp && resp.Body ) {
        res.header( 'Content-Disposition', `filename="${ mediaServer.mediaFilenameFromS3Location( s3Location ) }"` );
        res.send( resp.Body );
      }
      else {
        // TODO: response for not found video
        res.send(notFoundImage);
      }

    }
    catch(e) {
      return next(e);
    }

  }

  async function upload( req, res, next ) {

    try {

      const { mediaType } = req.params;

      const formOptions = {
        multiples: true,
        maxFileSize: 3*1024*1024*1024
      };

      const form = new formidable.IncomingForm( formOptions );

      const [ fields, files ] = await form.parse( req );

      const splitGroupId = fields.splitGroupId && fields.splitGroupId[0];
      const palletId = fields.palletId && fields.palletId[0];
      const lotId = fields.lotId && fields.lotId[0];

      // FormData doesn't support Booleans so fields.primary[0] will be the strings 'true' or 'false'
      let primary = false;
      if( fields.primary && fields.primary[0] === 'true' ) {
        primary = true;
      }

      const objectId = splitGroupId || palletId || lotId;

      if( !objectId ) {
        throw new IllegalActionError(`Media must be associated with a lot, pallet, or split group.`);
      }
      if( splitGroupId && !palletId ) {
        throw new IllegalActionError(`Split groups must be associated with a pallet.`);
      }
      if( mediaType !== 'images' && mediaType !== 'videos' ) {
        throw new IllegalActionError(`Invalid media type ${ mediaType }.`);
      }
      if( mediaType === 'videos' && !lotId ) {
        throw new IllegalActionError(`Videos must be associated with a lot.`);
      }

      let lot, pallet, media;

      for( let f of files.file ) {

        if( mediaType === 'images' ) {

          const mediaStoreResp = await mediaServer.storeImage( objectId, f.filepath, f.originalFilename );

          const s3Location = mediaStoreResp.Location;

          if( splitGroupId && palletId ) {

            pallet = await inventoryCommander.addInventoryPalletSplitGroupImage( palletId, splitGroupId, { s3: s3Location } );

          }
          else if ( palletId ) {

            pallet = await inventoryCommander.addInventoryPalletImage( palletId, { s3: s3Location } );

          }
          else if ( lotId ) {

            lot = await lotdb.getLotById( lotId );

            ( { media } = await lot.addMedia( { s3: s3Location, primary }, mediaType ) );


          }
          else {
            throw new InvalidRequestError();
          }

          console.log(`Unlinking temp file ${f.filepath}`);
          fs.promises.unlink(f.filepath);

        }
        else if( mediaType === 'videos' && lotId ) {

          lot = await lotdb.getLotById( lotId );

          ( { media } = await lot.addMedia( { isProcessing: true, primary }, mediaType ) );

          const cb = async ( s3Location ) => {

            // retrieve the lot again to make sure we have the latest version
            const _lot = await lotdb.getLotById( lotId );

            await _lot.finishProcessingMedia( media._id, mediaType, s3Location );

            console.log(`Unlinking temp file ${f.filepath}`);
            return fs.promises.unlink(f.filepath);

          };

          mediaServer.storeVideo( objectId, f.filepath, f.originalFilename, cb );

        }

      }

      res.json( { lot, pallet } );

    }
    catch(e) {
      return next(e);
    }
  }

  async function remove( req, res, next ) {

    const { mediaType } = req.params;

    const { splitGroupId, palletId, lotId, media } = req.body;

    try {

      let p;
      let msg;
      if( splitGroupId && palletId && mediaType === 'images' ) {
        p = inventoryCommander.removeInventoryPalletSplitGroupImage( palletId, splitGroupId, media._id );
        msg = `Removed media file ${ media.s3 || media.filename } from splitGroup ${ splitGroupId } in pallet ${ palletId }.`;
      }
      else if ( palletId && mediaType === 'images' ) {
        p = inventoryCommander.removeInventoryPalletImage( palletId, media._id );
        msg = `Removed media file ${ media.s3 || media.filename } from pallet ${ palletId }.`;
      }
      else if ( lotId ) {
        p = lotdb.removeMedia( lotId, media._id, mediaType );
        msg = `Removed media file ${ media.s3 || media.filename } from lot ${ lotId }.`;
      }
      else {
        throw new InvalidRequestError();
      }

      await p;

      console.log( msg );
      res.json({ status: "success" });

      if( media.s3 ) {

        const objectId = splitGroupId || palletId || lotId;
        const { ownerId } = mediaServer.parseS3Location( media.s3 );

        if( objectId === ownerId ) {
          try {
            const _resp = await mediaServer.remove( media.s3 );
            console.log(`Media file ${ mediaServer.mediaFilenameFromS3Location( media.s3 ) } deleted from AWS.`);
          }
          catch(e) {
            console.error(`Media file ${ mediaServer.mediaFilenameFromS3Location( media.s3 ) } could not be deleted from AWS.`);
            console.error(e);
          }
        }

      }

    }
    catch(e) {
      return next(e);
    }


  }

  // async function replaceMedia( req, res, next ) {

  //   try {

  //     const form = new formidable.IncomingForm( {} );

  //     const [ fields, files ] = await form.parse(req);

  //     const fileUploads = [];
  //     for(let [_, fileArray] of Object.entries(files)){

  //       const f = fileArray[0];
  //       const s3 = fields.s3[0];

  //       const s = mediaServer.replace( s3, f.filepath );
  //       fileUploads.push(s);
  //     }
  //     res.json( Promise.all( fileUploads ) );

  //   }
  //   catch(e) {
  //     return next(e);
  //   }

  // }

  async function listImages(req, res) {
    const images = await mediaServer.listImages( { urlEncode: !!req.query.url_encode } );
    res.json( { images } );
  }

  // TODO: video
  async function cloneImages( req, res, next ) {

    try {
      const { lotId, palletId, images } = req.body;

      let lot, pallet;

      for( let image of images ) {
        if( lotId ) {
          const resp = await mediaServer.clone( image, lotId, 'images' );
          ( { lot } = await lotdb.addMedia( lotId, { s3: resp.s3Location }, 'images' ) );
        }
        else if ( palletId ) {
          const resp = await mediaServer.clone( image, palletId, 'images' );
          pallet = await inventoryCommander.addInventoryPalletImage( palletId, { s3: resp.s3Location } );
        }
      }

      res.json( { lot, pallet } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function proxy( req, res, next ) {

    let url;

    try {

      url = decodeURIComponent( req.query.url );

      const urlResponse = await axios({
        method: 'get',
        url,
        responseType: 'stream'
      });
      const urlReadStream = urlResponse.data;

      urlReadStream.pipe( res );
    }
    catch (e) {
      return next( new ExternalMediaNotFoundError( url ));
    }

  }

  /**************************************
   * Return routes
   * =============
   *
   ************/

  return router;
}