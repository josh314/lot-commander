const fs = require('fs');
const path = require('path');

const express = require('express');
const formidable = require('formidable');
const axios = require('axios');

const {
  ExternalImageNotFoundError,
  InvalidRequestError
} = require('../errors');

const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));
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
    '/upload',
    upload
  );
  router.post(
    '/remove',
    removeImage
  );
  router.post(
    '/replace',
    replaceImage
  );
  router.get(
    '/list',
    list
  );
  router.post(
    '/clone',
    clone
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

  async function get(req, res) {
    const s3Location = decodeURIComponent(req.query.s3);
    const imgResp = await imageServer.get( { s3Location: s3Location } );
    if(imgResp && imgResp.Body) {
      res.header( 'Content-Disposition', `filename="${imageServer.imageName(s3Location)}"` );
      res.send(imgResp.Body);
    }
    else {
      res.send(notFoundImage);
    }
  }

  async function upload( req, res, next ) {

    try {
      const form = new formidable.IncomingForm( { multiples: true } );

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
        throw new InvalidRequestError();
      }

      let lot, pallet;

      for( let f of files.file ) {

        const imageStoreResp = await imageServer.store( objectId, f.filepath, f.originalFilename );

        if( imageStoreResp ) {

          const s3Location = imageStoreResp.Location;

          if( splitGroupId && palletId ) {

            pallet = await inventoryCommander.addInventoryPalletSplitGroupImage( palletId, splitGroupId, { s3: s3Location } );

          }
          else if ( palletId ) {

            pallet = await inventoryCommander.addInventoryPalletImage( palletId, { s3: s3Location } );

          }
          else if ( lotId ) {

            lot = await lotdb.getLotById( lotId );

            await lot.addImage( { s3: s3Location, primary } );

          }

        }

        console.log(`Unlinking temp file ${f.filepath}`);
        fs.promises.unlink(f.filepath);

      }

      res.json( { lot, pallet } );

    }
    catch(e) {
      return next(e);
    }
  }

  async function removeImage( req, res, next ) {

    const { splitGroupId, palletId, lotId, image } = req.body;

    try {

      let p;
      let msg;
      if( splitGroupId && palletId ) {
        p = inventoryCommander.removeInventoryPalletSplitGroupImage( palletId, splitGroupId, image._id );
        msg = `Removed image ${image.s3 || image.filename} from splitGroup ${splitGroupId} in pallet ${palletId}.`;
      }
      else if ( palletId ) {
        p = inventoryCommander.removeInventoryPalletImage( palletId, image._id );
        msg = `Removed image ${image.s3 || image.filename} from pallet ${palletId}.`;
      }
      else if ( lotId ) {
        p = lotdb.removeImage( lotId, image._id );
        msg = `Removed image ${image.s3 || image.filename} from lot ${lotId}.`;
      }
      else {
        throw new InvalidRequestError();
      }

      const removeImageResp = await p;

      if( removeImageResp.error ) {
        console.error( removeImageResp.error );
        res.json({error: 'Server error.'});
      }
      else {

        console.log( msg );
        res.json({ status: "success" });

        if(image.s3) {

          const objectId = splitGroupId || palletId || lotId;
          const { ownerId } = imageServer.parseS3Location( image.s3 );

          if( objectId === ownerId ) {
            try {
              const _resp = await imageServer.remove(image.s3);
              console.log(`Image ${imageServer.imageName(image.s3)} deleted from AWS.`);
            }
            catch(e) {
              console.error(`Image ${imageServer.imageName(image.s3)} could not be deleted from AWS.`);
              console.error(e);
            }
          }

        }

      }


    }
    catch(e) {
      return next(e);
    }


  }

  async function replaceImage( req, res, next ) {

    try {

      const form = new formidable.IncomingForm( {} );

      const [ fields, files ] = await form.parse(req);

      const fileUploads = [];
      for(let [_, fileArray] of Object.entries(files)){

        const f = fileArray[0];
        const s3 = fields.s3[0];

        const s = imageServer.replace( s3, f.filepath );
        fileUploads.push(s);
      }
      res.json(Promise.all(fileUploads));

    }
    catch(e) {
      return next(e);
    }

  }

  async function list(req, res) {
    const list = await imageServer.list( { urlEncode: !!req.query.url_encode } );
    res.json( { images: list } );
  }

  async function clone( req, res, next ) {

    try {
      const { lotId, palletId, images } = req.body;

      let lot, pallet;

      for( let image of images ) {
        if( lotId ) {
          const resp = await imageServer.clone( image, lotId );
          lot = await lotdb.addImage( lotId, { s3: resp.s3Location });
        }
        else if ( palletId ) {
          const resp = await imageServer.clone( image, palletId );
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
      return next( new ExternalImageNotFoundError( url ));
    }

  }

  /**************************************
   * Return routes
   * =============
   *
   ************/

  return router;
}