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

  const p = new RegExp(`https:\/\/(.*)\.s3\.amazonaws\.com\/(.*)`);
  const match = s3Location.match(p);
  if(match) {
    res.bucket = match[1];
    res.key = match[2];
  }

  return res;
};

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

    await s3.putBucketCors({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: [
              "GET"
            ],
            AllowedOrigins: [ 
              "*"
            ],
            MaxAgeSeconds: 3000
          }
        ]
      }
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

module.exports = {
  bucketName: bucketName,
  imageName: imageName,
  remove: remove,
  replace: replace,
  store: store,
};