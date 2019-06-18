const fs = require('fs');
const path = require('path');
const stream = require('stream');

const aws = require('aws-sdk');
aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'lot-commander'});
const s3 = new aws.S3({apiVersion: '2006-03-01'});

const sharp = require('sharp');
const MAX_IMAGE_WIDTH = 640;

const bucketName = (lotId) => `lot-img-${lotId}`;
const getLotId = (bucket) => {
  const p = /lot-img-([a-fA-F0-9]+)/;
  const match = bucket.match(p);
  return match ? match[1] : null;
};

const imageName = (s3Location) => {
  const p = new RegExp(`https:\\/\\/(.*)\\.s3\\.amazonaws\\.com\\/(.*)`);
  const match = s3Location.match(p);
  return match ? match[2] : null;
};

const parseS3Location = (s3Location) => {
  const res = {};

  const p = new RegExp(`https:\\/\\/(.*)\\.s3\\.amazonaws\\.com\\/(.*)`);
  const match = s3Location.match(p);
  if(match) {
    res.bucket = match[1];
    res.key = match[2] && decodeURIComponent(match[2]);
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

const get = async function(opts = {}) {
  let { bucket, key } = opts.s3Location ? parseS3Location(opts.s3Location) : opts;
  if(!bucket || !key) {
    return null;
  }
  return s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise();
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

    key = `${path.parse(imgName).name}.jpg`;
  }
  else {
    readStream = fs.createReadStream(imgPath);
    key = imgName;
  }

  return storeStream(bucketName(lotId), readStream, key, dedup);
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
  const { bucket , key } = parseS3Location(s3Location);
  return store(getLotId(bucket), imgPath, key, { dedup: false });
};

const deleteLotBucket = async (lotId) => {
  try {
    const bucket = bucketName(lotId);

    //1.) get list of all objects
    // 2.) delete each object s3.deleteObjects
    // 3.) await all deletions then delete bucket
    const list = await s3.listObjects({ Bucket: bucket }).promise();
    
    if(list.Contents && list.Contents.length) {
      await s3.deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: list.Contents.map(object => { 
            return {
              Key: object.Key
            };
          })
        }
      }).promise();
    }

    return s3.deleteBucket({ Bucket: bucket }).promise();
  }
  catch (e) {
    throw new Error(e);
  }
};

module.exports = {
  bucketName: bucketName,
  deleteLotBucket: deleteLotBucket,
  get: get,
  imageName: imageName,
  remove: remove,
  replace: replace,
  store: store,
};