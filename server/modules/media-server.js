const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { URL } = require('url');

const {
  IllegalActionError
} = require('../errors');

const {
  convertVideo,
  formatAsCompressedJpeg,
  probeVideo
} = require('./media-processing');

const {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");

const s3 = new S3Client({
  region: 'us-east-1',
});

const axios = require('axios');
const mime = require('mime-types');

const __BUCKETS__ = {
  images: 'lot-images',
  videos: 'lot-videos'
};


// TODO: thsi seems to work even when there is an explicit region
const mediaUrl = (type, s3Key) => `https://${ __BUCKETS__[ type ] }.s3.amazonaws.com/${ s3Key }`;

const mediaFilenameFromS3Location = (s3Location) => {
  const p = /https:\/\/.*\.s3(.*)?\.amazonaws\.com\/.*\/(.*)/;
  const match = s3Location.match(p);
  if( match ) {
    return match[2] ? match[2] : match[1];
  }
  else {
    return null;
  }
};

const isMediaServerLink = s => {

  const p = new RegExp(`https://(${ Object.values( __BUCKETS__ ).join("|") }).s3(.*)?.amazonaws.com/.*`);

  return p.test( s );

};

const parseS3Location = ( s3Location ) => {
  const res = {};

  const p = /https:\/\/(.*)\.s3(.*)?\.amazonaws\.com\/(.*)\/(.*)/;
  const match = s3Location.match(p);
  if(match) {

    res.bucket = match[1];
    res.region = match[2];
    res.ownerId = match[3];
    res.filename = match[4] && decodeURIComponent(match[4]);
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

const storeImage =  async function( ownerId, pathToFile, filename, opts = {} ) {

  const compress = 'compress' in opts ? opts.compress : true;

  let readStream;
  let key;

  if( compress ) {
    const buffer = await formatAsCompressedJpeg( pathToFile );

    readStream = new stream.PassThrough();
    readStream.end( buffer );

    key = `${ ownerId }/${path.parse( filename ).name}.jpg`;
  }
  else {
    readStream = fs.createReadStream( pathToFile );
    key = `${ ownerId }/${ filename }`;
  }

  const dedup = 'dedup' in opts ? opts.dedup : true;
  return storeStream( readStream, 'images', key, dedup );
};

function shouldConvertVideo( metadata ) {
  const videoStreamMetadata = metadata.streams.find( _ => _.codec_type === 'video' );
  return videoStreamMetadata.codec_name !== 'h264' || videoStreamMetadata.profile !== 'High';
}

const storeVideo = async function( ownerId, pathToFile, filename, cb, opts = {} ) {

  const metadata = await probeVideo( pathToFile );
  const convert = opts.convert || shouldConvertVideo( metadata );

  const finish = async ( pathToFile, unlink ) => {

    const readStream = fs.createReadStream( pathToFile );
    const key = `${ ownerId }/${ path.parse( filename ).name }.mp4`;
    const resp = await storeStream( readStream, 'videos', key, true );

    if( unlink ) {
      fs.unlinkSync( pathToFile );
    }

    return cb( resp.Location );

  };

  if( convert ) {
    console.log(`Converting file \`${ filename }\` to H264...`);
    const convertedFile = 'tmp.mp4';

    return convertVideo( pathToFile, convertedFile, filename )
      .then( () => finish( convertedFile, true ) );

  }
  else {
    return finish( pathToFile, false );
  }

};


const storeStream = async function( readStream, mediaType, _key, dedup ) {

  const Bucket = __BUCKETS__[ mediaType ];

  // spaces in S3 keys are allowed but cause confusion when reconstructing key from S3 object URL. So nix that here.
  let key = _key.replace( / /g , '+' );

  if( !Bucket ) {
    throw new IllegalActionError( `Invalid media type: ${ mediaType }` );
  }

  if(dedup) {

    const command = new ListObjectsV2Command( { Bucket } );
    const list = await s3.send( command );

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

  const upload = new Upload({
    client: s3,
    params: {
      Bucket,
      Key: key,
      Body: readStream,
      ACL: "public-read",
      ContentType: mime.lookup( key ) || 'application/octet-stream',
    },
  });

  return upload.done();

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

  // Note that the source and destination addressing is somewhat asymmetric in the CopyObjectCommand:
  // The src is specified as a single string with the bucket and key separated by a '/' while destination key and bucket are separate params.
  // The destination uses a literal '/' within the key while the src uses a URL-encoded '%2F' within the key.

  let { bucket, filename, key, mediaType } = parseS3Location( srcS3Location );

  const subkey = decodeURIComponent(filename).replace(/ /g, '+');

  const destKey = `${destId}/${ subkey }`;
  const src = `/${bucket}/${encodeURIComponent(key)}`;

  const command = new CopyObjectCommand({
    Bucket: bucket, // destination bucket
    Key: destKey, // destination key
    CopySource: src, // source bucket AND key
    ACL: 'public-read',
    ContentType: mime.lookup( filename ) || 'application/octet-stream',
    MetadataDirective: 'REPLACE'
  });
  await s3.send( command );

  return {
    s3Location: mediaUrl( mediaType, `${ destId }/${ encodeURIComponent( subkey) }` )
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

const listImages = async ( ) => {

  const opts = {
    Bucket: __BUCKETS__.images,
    EncodingType: "url",
  };

  let imageObjects = [];
  let continuationToken;

  do {

    if( continuationToken ) {
      opts.ContinuationToken = continuationToken;
    }

    const command = new ListObjectsV2Command( opts );
    const res = await s3.send( command );

    imageObjects = imageObjects.concat( res.Contents );
    continuationToken = res.NextContinuationToken;

  } while( continuationToken );

  // sort by recency
  imageObjects.sort( (a,b) => a.LastModified > b.LastModified ? -1 : 1);
  const images = imageObjects.map( _ => mediaUrl( 'images', _.Key ) );

  return images;
};

async function get( s3Location ) {
  const { bucket, key } = parseS3Location( s3Location );
  return getByBucketAndKey( bucket, key );
}

async function getByBucketAndKey( Bucket, Key ) {

  try {

    if(!Bucket || !Key) {
      return null;
    }

    const command = new GetObjectCommand({
      Bucket,
      Key,
    });

    return s3.send( command );

  }
  catch (e) {
    console.error(`No S3 object in bucket ${ Bucket } for key ${ Key }.`);
    return null;
  }

}

const remove = async function(s3Location) {
  const { bucket, key } = parseS3Location(s3Location);

  if (key) {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });
    return s3.send( command );
  } else {
    return Promise.resolve({});
  }
};


// const replace = ( s3Location, path ) => {
//   const { ownerId, filename, mediaType } = parseS3Location( s3Location );
//   return storeMedia( ownerId, path, filename, mediaType, { dedup: false } );
// };

const deleteLotMedia = async ( lotId, mediaType ) => {
  try {
    // 1.) get list of all objects
    // 2.) delete them in a batch with DeleteObjectsCommand

    const command = new ListObjectsV2Command({ Bucket: __BUCKETS__[ mediaType ], Prefix: lotId });
    const list = await s3.send( command );

    if(list.Contents && list.Contents.length) {

      const keysToDelete = list.Contents.map(object => {
        return {
          Key: object.Key
        };
      });

      const _command = new DeleteObjectsCommand({
        Bucket: __BUCKETS__[ mediaType ],
        Delete: {
          Objects: keysToDelete,
        }
      });

      return await s3.send( _command );
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
  // replace,
  storeImage,
  storeVideo,

  // helpers
  isMediaServerLink,
  mediaFilenameFromS3Location,
  parseS3Location
};