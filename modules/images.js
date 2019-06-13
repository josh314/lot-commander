const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const save = Promise.promisify(fs.rename);
const unlink = Promise.promisify(fs.unlink);

const formidable = require('formidable');
const archiver = require('archiver');

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));

const imgPath = path.join(__basedir, __config.imgPath);
if(!fs.existsSync(imgPath)) {
  fs.mkdirSync(imgPath);
}

async function get(req, res) {
  const s3Location = decodeURIComponent(req.query.s3);
  const imgResp = await imageServer.get( { s3Location: s3Location } );
  res.send(imgResp.Body);
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
          unlink(f.path);
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
    __logger.error(removeImageFromLotResp.error);
    res.json({error: 'Server error.'});
  }
  else {
    __logger.info(`Removed image ${image.s3 || image.filename} from lot ${lotId}.`);
    res.json({ status: "success" });
    if(image.s3) {
      try {
        await imageServer.remove(lotId, image.s3);
        __logger.info(`Image ${imageServer.imageName(image.s3)} deleted from bucket ${imageServer.bucketName(lotId)}.`);
      }
      catch(e) {
        __logger.warn(`Image ${imageServer.imageName(image.s3)} could not be deleted from bucket ${imageServer.bucketName(lotId)}.`);
        __logger.error(e);
      }
    }
  }
}

async function downloadImages(req, res) {

  const lotRequest = lotdb.getLotById(req.params.lotId);

  __logger.info(`Requesting image download for lotId ${req.params.lotId}...`);
  const archiveType = 'zip';
  const archive = archiver(archiveType, {
    gzip: true,
    zlib: { level: 9 } // Sets the compression level.
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.on('end', ()=>{
    __logger.info(`Archiver wrote ${archive.pointer()} bytes.`);
  });

  const lot = await lotRequest;
  const archiveFile = `${lot.handle}-images.${archiveType}`;
  res.attachment(archiveFile);
  archive.pipe(res);

  for(let image of lot.images) {
    const p = path.normalize(path.join(__config.imgPath, image.filename));
    __logger.info(`Appending to archive file ${image.filename} as ${image.filename}...`);
    archive.file(p, {name: image.filename});
  }
  archive.finalize();
  __logger.log('Image archive finalized');
}

async function replaceImage(req, res) {
  const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    const fileUploads = [];
    for(let [_, f] of Object.entries(files)){
      let s;
      if(fields.s3) {
        s = imageServer.replace(fields.s3, f.path);
      }
      else {
        s = save(f.path, path.join(imgPath, fields.filename), (err)=>{
          if (err) {
            __logger.error(err);
            return;
          }
        });
      }
      fileUploads.push(s);
    }
    res.json(Promise.all(fileUploads));
  });
}

module.exports = {
  get: get,
  upload: upload,
  removeImage: removeImage,
  replaceImage: replaceImage,
  downloadImages: downloadImages,
};