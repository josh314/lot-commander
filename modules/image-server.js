const fs = require('fs');

const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01'});

const S3_LOT_IMG_BUCKET_PREFIX = 'lot-img';


const bucketName = (lotId) => `${S3_LOT_IMG_BUCKET_PREFIX}-${lotId}`;

const imageName = (s3Location) => {
  const p = new RegExp(`https:\/\/.*\.s3\.amazonaws\.com\/(.*)`);
  const match = s3Location.match(p);
  return match ? match[1] : null;
};

const parseS3Location = (s3Location) => {
  const res = {};

  const p = new RegExp(`https:\\/\\/(.*)\\.s3\\.amazonaws\\.com\\/(.*)`);
  const match = s3Location.match(p);
  if(match) {
    res.bucket = match[1];
    res.key = match[2];
  }

  return res;
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
}

const store = async function(lotId, imgPath, imgName) {
  const bucket = bucketName(lotId);
  try {
    await s3.headBucket({ Bucket: bucket }).promise();
  }
  catch (e) {
    const newBucket = await s3.createBucket({ 
      Bucket: bucket,
      ACL: 'public-read',
    }).promise();
  }

  return s3.upload({
    Bucket: bucket,
    Key: imgName,
    Body: fs.createReadStream(imgPath),
    ACL: "public-read",
  })
    .promise();
};


const remove = function(lotId, s3Location) {
  const bucket = bucketName(lotId);
  const key = imageName(s3Location);
  if(key) {
    return s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise();
  }
  else return Promise({});
}

const replace = (s3Location, imgPath) => {
  const { bucket , key } = parseS3Location(s3Location);
  return s3.upload({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(imgPath),
    ACL: "public-read",
  })
    .promise();
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