const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { URL } = require('url');

const {
  IllegalActionError
} = require('../errors');

const aws = require('aws-sdk');
aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'lot-commander'});
const s3 = new aws.S3({apiVersion: '2006-03-01'});

const axios = require('axios');

const sharp = require('sharp');
const MAX_IMAGE_WIDTH = 1920;

const __BUCKETS__ = {
  images: 'lot-images',
  videos: 'lot-videos'
};

const mediaUrl = (type, s3Key) => `https://${ __BUCKETS__[ type ] }.s3.amazonaws.com/${ s3Key }`;

const mediaFilenameFromS3Location = (s3Location) => {
  const p = /https:\/\/.*\.s3\.amazonaws\.com\/.*\/(.*)/;
  const match = s3Location.match(p);
  return match ? match[1] : null;
};

const isMediaServerLink = s => {

  const p = new RegExp(`https://(${ Object.values( __BUCKETS__ ).join("|") }).s3.amazonaws.com/.*`);

  return p.test( s );

};

const parseS3Location = ( s3Location ) => {
  const res = {};

  const p = /https:\/\/(.*)\.s3\.amazonaws\.com\/(.*)\/(.*)/;
  const match = s3Location.match(p);
  if(match) {

    res.bucket = match[1];
    res.ownerId = match[2];
    res.filename = match[3] && decodeURIComponent( match[3] );
    res.key = `${ res.ownerId }/${ res.filename }`;

    if( res.bucket === __BUCKETS__.images ) {
      res.mediaType = 'images';
    }
    else if( res.bucket === __BUCKETS__.videos ) {
      res.mediaType = 'videos';
    }

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

const storeMedia =  async function( ownerId, pathToFile, filename, mediaType, opts = {} ) {

  const compress = 'compress' in opts ? opts.compress : true;

  let readStream;
  let _key;

  if( mediaType === 'images' && compress ) {
    const buffer = await formatAsCompressedJpeg( pathToFile );

    readStream = new stream.PassThrough();
    readStream.end( buffer );

    _key = `${ ownerId }/${path.parse( filename ).name}.jpg`;
  }
  else {
    readStream = fs.createReadStream( pathToFile );
    _key = `${ ownerId }/${ filename }`;
  }

  // spaces in S3 keys are allowed but cause confusion when reconstructing key from S3 object URL. So nix that here.
  const key = _key.replace( / /g , '+' );

  const dedup = 'dedup' in opts ? opts.dedup : true;
  return storeStream( readStream, mediaType, key, dedup );
};

const storeStream = async function( readStream, mediaType, key, dedup ) {

  const Bucket = __BUCKETS__[ mediaType ];

  if( !Bucket ) {
    throw new IllegalActionError( `Invalid media type: ${ mediaType }` );
  }

  if(dedup) {
    const list = await s3.listObjects({ Bucket }).promise();
    const mediaObjects = list.Contents;
    if( mediaObjects && mediaObjects.length) {
      const found = mediaObjects.find(_ => _.Key === key);
      if(found) {
        const keyProps = path.parse(key);
        const dupes = mediaObjects.filter(_ => path.parse(_.Key).name.match(new RegExp(`${keyProps.name}(-[0-9]+)?`) ) );
        key = `${keyProps.name}-${dupes.length}${keyProps.ext}`;
      }
    }
  }

  return s3.upload({
    Bucket,
    Key: key,
    Body: readStream,
    ACL: "public-read",
  })
    .promise();
};

const clone = ( location, destId, mediaType = 'images' ) => {

  if( isMediaServerLink(location) ) {

    return cloneFromS3( location, destId );

  }
  else {

    return cloneFromUrl( location, destId, mediaType );

  }

};

const cloneFromS3 = async ( srcS3Location, destId ) => {

  let { bucket, filename, key, mediaType } = parseS3Location( srcS3Location );

  const destKey = `${destId}/${ filename.replace(/\+/g, ' ') }`;
  const src = `/${bucket}/${key}`;

  await s3.copyObject({
    Bucket: bucket,
    CopySource: src,
    Key: destKey,
    ACL: 'public-read'
  }).promise();

  return {
    s3Location: mediaUrl( mediaType, destKey )
  };

};


const cloneFromUrl = async ( urlString, destId, mediaType ) => {

  const urlResponse = await axios({
    method: 'get',
    url: urlString,
    responseType: 'stream'
  });
  const urlReadStream = urlResponse.data;

  const url = new URL( urlString );

  const pathSegments = url.pathname.split('/');

  const key = `${ destId }/${ decodeURIComponent( pathSegments[ pathSegments.length - 1 ] ) }`;

  const storeResponse = await storeStream( urlReadStream, mediaType, key, false );

  return {
    s3Location: storeResponse.Location
  };

};

const listImages = async ( { urlEncode } = {} ) => {

  const opts = { Bucket: __BUCKETS__.images };
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
  const images = imageObjects.map( _ => urlEncode ? mediaUrl( 'images', _.Key ) : _.Key );

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
    console.error(`No S3 object in bucket ${ bucket } for key ${ key }.`);
    return null;
  });
};

const remove = function( s3Location ) {

  const { bucket, key } = parseS3Location( s3Location );

  if(key) {
    return s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise();
  }
  else {
    return Promise({});
  }

};

const replace = ( s3Location, path ) => {
  const { ownerId, filename, mediaType } = parseS3Location( s3Location );
  return storeMedia( ownerId, path, filename, mediaType, { dedup: false } );
};

const deleteLotMedia = async ( lotId, mediaType ) => {
  try {
    //1.) get list of all objects
    // 2.) delete each object s3.deleteObjects
    const list = await s3.listObjectsV2({ Bucket: __BUCKETS__[ mediaType ], Prefix: lotId }).promise();
    if(list.Contents && list.Contents.length) {
      const keysToDelete = list.Contents.map(object => {
        return {
          Key: object.Key
        };
      });
      await s3.deleteObjects({
        Bucket: __BUCKETS__[ mediaType ],
        Delete: {
          Objects: keysToDelete,
        }
      }).promise();
    }

  }
  catch (e) {
    throw e;
  }
};

const deleteAllLotMedia = async ( lotId ) => {
  return Promise.all(
    [
      deleteLotMedia( lotId, 'images' ),
      deleteLotMedia( lotId, 'videos' )
    ]
  );
};

module.exports = {
  // main
  deleteAllLotMedia,
  deleteLotMedia,
  clone,
  get,
  listImages,
  remove,
  replace,
  storeMedia,

  // helpers
  isMediaServerLink,
  mediaFilenameFromS3Location,
  parseS3Location
};