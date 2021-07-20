const fs = require('fs');
const path = require('path');

const express = require('express');
const formidable = require('formidable');

const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));
const notFoundImage = fs.readFileSync(path.join(__basedir, '../assets', 'missing-image.jpg'));

module.exports = routes;

function routes( { lotdb } ) {
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
    '/primary',
    lotdb.setPrimaryImage
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


  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function get(req, res) {
    const s3Location = decodeURIComponent(req.query.s3);
    const imgResp = await imageServer.get( { s3Location: s3Location } );
    if(imgResp && imgResp.Body) {
      res.send(imgResp.Body);
    }
    else {
      res.send(notFoundImage);
    }
  }

  function upload(req,res) {
    const form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      const fileUploads = [];
      for(let [_, f] of Object.entries(files)){
        const s = imageServer.store(fields.lotId, f.path, f.name).then(resp=>{
          if(resp) {
            return lotdb.addImage(fields.lotId, { s3: resp.Location });
          }
        })
          .then(_=>{
            console.log(`Unlinking temp file ${f.path}`);
            fs.promises.unlink(f.path);
            return _;
          });
        fileUploads.push(s);
      }
      res.json(Promise.all(fileUploads));
    });
  }


  async function removeImage(req, res) {
    const [lotId, image] = [req.body.lotId, req.body.image];
    const removeImageFromLotResp = await lotdb.removeImage(lotId, image);
    if(removeImageFromLotResp.error) {
      console.error(removeImageFromLotResp.error);
      res.json({error: 'Server error.'});
    }
    else {
      console.log(`Removed image ${image.s3 || image.filename} from lot ${lotId}.`);
      res.json({ status: "success" });
      if(image.s3) {
        try {
          await imageServer.remove(image.s3);
          console.log(`Image ${imageServer.imageName(image.s3)} deleted from lot ${lotId}.`);
        }
        catch(e) {
          console.error(`Image ${imageServer.imageName(image.s3)} could not be deleted from lot ${lotId}.`);
          console.error(e);
        }
      }
    }
  }

  async function replaceImage(req, res) {
    const form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      const fileUploads = [];
      for(let [_, f] of Object.entries(files)){
        const s = imageServer.replace(fields.s3, f.path);
        fileUploads.push(s);
      }
      res.json(Promise.all(fileUploads));
    });
  }

  async function list(req, res) {
    const list = await imageServer.list( { urlEncode: !!req.query.url_encode } );
    res.json( { images: list } );
  }

  async function clone( req, res ) {

    try {
      const { lotId, images } = req.body;
  
      for( let image of images ) {
        const resp = await imageServer.clone( image, lotId );
        await lotdb.addImage( lotId, { s3: resp.s3Location });
      }
  
      res.json( { success: true } );
    }
    catch(e) {
      console.error(e);
      res.json( { success: false } );
    }
  
  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/

  return router;
}