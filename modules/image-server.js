const fs = require('fs');

const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01'});

const S3_LOT_IMG_BUCKET_PREFIX = 'lot-img';


const bucketName = (lotId) => `${S3_LOT_IMG_BUCKET_PREFIX}-${lotId}`;

const imageName = (lotId, s3Location) => {
  const bucket = bucketName(lotId);
  const p = new RegExp(`https:\/\/${bucket}\.s3\.amazonaws\.com\/(.*)`);
  const match = s3Location.match(p);
  return match ? match[1] : null;
};

const store = async function(lotId, imgPath, imgName) {
  const bucket = bucketName(lotId);
  try {
    await s3.headBucket({ Bucket: bucket }).promise();
  }
  catch (e) {
    await s3.createBucket({ 
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

module.exports = {
  bucketName: bucketName,
  imageName: imageName,
  remove: remove,
  store: store,
};