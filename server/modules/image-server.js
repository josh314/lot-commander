const fs = require('fs');
const path = require('path');
const stream = require('stream');

const aws = require('aws-sdk');
aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'lot-commander'});
const s3 = new aws.S3({apiVersion: '2006-03-01'});

const sharp = require('sharp');
const MAX_IMAGE_WIDTH = 640;

const BUCKET = 'lot-images';

const imageUrl = s3Key => `https://${ BUCKET }.s3.amazonaws.com/${ s3Key }`;

const imageName = (s3Location) => {
  const p = /https:\/\/.*\.s3\.amazonaws\.com\/.*\/(.*)/;
  const match = s3Location.match(p);
  return match ? match[1] : null;
};

const parseS3Location = (s3Location) => {
  const res = {};

  const p = /https:\/\/(.*)\.s3\.amazonaws\.com\/(.*)\/(.*)/;
  const match = s3Location.match(p);
  if(match) {
    res.bucket = match[1];
    res.lotId = match[2];
    res.imgName = match[3] && decodeURIComponent(match[3]);
    res.key = `${res.lotId}/${res.imgName}`;
  }

  return res;
};

const formatAsCompressedJpeg = async function(imgPath, opts={}) {

  const img = sharp(imgPath);

  const meta = await img.metadata();

  if(!meta.width || meta.width > MAX_IMAGE_WIDTH) {
    img.resize(MAX_IMAGE_WIDTH);
  }

  return img
    .jpeg({
      quality: opts.quality || 80,
      progressive: true,
      chromaSubsampling: '4:2:0',
      force: true
    })
    .toBuffer();
};

const store = async function(lotId, imgPath, imgName, opts={}) {
  const compress = 'compress' in opts ? opts.compress : true;
  const dedup = 'dedup' in opts ? opts.dedup : true;

  let readStream;
  let key;

  if(compress) {
    const imgBuffer = await formatAsCompressedJpeg(imgPath);

    readStream = new stream.PassThrough();
    readStream.end(imgBuffer);

    key = `${lotId}/${path.parse(imgName).name}.jpg`;
  }
  else {
    readStream = fs.createReadStream(imgPath);
    key = `${lotId}/${imgName}`;
  }

  return storeStream(BUCKET, readStream, key, dedup);
};

const storeStream = async function(bucket, readStream, key, dedup) {
  try {
    await s3.headBucket({ Bucket: bucket }).promise();
  }
  catch (error) {
    const newBucket = await s3.createBucket({ 
      Bucket: bucket,
      ACL: 'public-read',
    }).promise();
    __logger.debug(newBucket);
  }

  if(dedup) {
    const list = await s3.listObjects({ Bucket: bucket }).promise();
    const imageObjects = list.Contents;
    if(imageObjects && imageObjects.length) {
      const found = imageObjects.find(_ => _.Key === key);
      if(found) {
        const keyProps = path.parse(key);
        const dupes = imageObjects.filter(_ => path.parse(_.Key).name.match(new RegExp(`${keyProps.name}(-[0-9]+)?`) ) );
        key = `${keyProps.name}-${dupes.length}${keyProps.ext}`;
      }
    }
  }

  return s3.upload({
    Bucket: bucket,
    Key: key,
    Body: readStream,
    ACL: "public-read",
  })
    .promise();
};

const clone = async ( srcS3Location, destLotId ) => {

  let { bucket, imgName, key } = parseS3Location( srcS3Location );

  const destKey = `${destLotId}/${imgName.replace(/\+/g, ' ')}`;
  const src = `/${bucket}/${key}`;

  await s3.copyObject({
    Bucket: bucket,
    CopySource: src,
    Key: destKey,
    ACL: 'public-read'
  }).promise();

  return {
    s3Location: imageUrl( destKey )
  };

};

const list = async ( { urlEncode } = {} ) => {

  const opts = { Bucket: BUCKET };
  if( urlEncode ) {
    opts.EncodingType = "url";
  }

  let imageObjects = [];
  let continuationToken;
  
  do {
    
    if( continuationToken ) {
      opts.ContinuationToken = continuationToken;
    }

    const res = await s3.listObjectsV2( opts ).promise();
    imageObjects = imageObjects.concat( res.Contents );
    continuationToken = res.NextContinuationToken;

  } while( continuationToken );

  // sort by recency
  imageObjects.sort( (a,b) => a.LastModified > b.LastModified ? -1 : 1);
  const images = imageObjects.map( _ => urlEncode ? imageUrl( _.Key ) : _.Key );

  return images;
};

const get = async function(opts = {}) {
  let { bucket, key } = opts.s3Location ? parseS3Location(opts.s3Location) : opts;
  if(!bucket || !key) {
    return null;
  }
  return s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise().catch(_e=> {
    __logger.error(`No image for key ${key}.`);
    return null;
  });
};

const remove = function(s3Location) {
  const { bucket, key } = parseS3Location(s3Location);
  if(key) {
    return s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise();
  }
  else return Promise({});
};

const replace = (s3Location, imgPath) => {
  const { lotId, imgName } = parseS3Location(s3Location);
  return store(lotId, imgPath, imgName, { dedup: false });
};

const deleteLotImages = async (lotId) => {
  try {
    //1.) get list of all objects
    // 2.) delete each object s3.deleteObjects
    const list = await s3.listObjectsV2({ Bucket: BUCKET, Prefix: lotId }).promise();
    if(list.Contents && list.Contents.length) {
      const keysToDelete = list.Contents.map(object => { 
        return {
          Key: object.Key
        };
      });
      await s3.deleteObjects({
        Bucket: BUCKET,
        Delete: {
          Objects: keysToDelete,
        }
      }).promise();
    }

  }
  catch (e) {
    throw new Error(e);
  }
};

module.exports = {
  deleteLotImages: deleteLotImages,
  clone: clone,
  get: get,
  imageName: imageName,
  list: list,
  remove: remove,
  replace: replace,
  store: store,
};