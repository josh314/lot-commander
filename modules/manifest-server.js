const fs = require('fs');
const path = require('path');

const aws = require('aws-sdk');
aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'lot-commander'});
const s3 = new aws.S3({apiVersion: '2006-03-01'});

const BUCKET = 'wsn-manifest-files';

const store = async function(lotId, manifestPath, manifestName, opts={}) {
  const dedup = 'dedup' in opts ? opts.dedup : true;
  const readStream = fs.createReadStream(manifestPath);
  const key = `${lotId}/${manifestName}`;

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
    const objs = list.Contents;
    if(objs && objs.length) {
      const found = objs.find(_ => _.Key === key);
      if(found) {
        const keyProps = path.parse(key);
        const dupes = objs.filter(_ => path.parse(_.Key).name.match(new RegExp(`${keyProps.name}(-[0-9]+)?`) ) );
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

module.exports = {
  store: store
};