const stream = require('stream');

const { fromIni } = require('@aws-sdk/credential-providers');
const {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");

// Create a new S3 client using credentials from the specified profile
const s3 = new S3Client({
  region: 'us-east-1',
  credentials: fromIni({ profile: 'lot-commander' }),
});

const ExcelBuilder = require('excel/lib/builder');

const __EXPRESSHOP_MANIFESTS_BUCKET__ = 'expresshop-manifests';


module.exports = {
  build: build,
  get: get,
  list: list,
  put: put,
};

// Build excel and save to S3 or stream back immediately
function build( sheets, saveAsKey = '', isPublic = false) {

  const eb = new ExcelBuilder( { sheets } );

  const outStream = new stream.PassThrough();

  eb.build(outStream);

  if( saveAsKey ) {

    return put( outStream, saveAsKey, isPublic );

  }
  else {
    return outStream;
  }

}

async function get( key ) {

  const command = new GetObjectCommand({
    Bucket: __EXPRESSHOP_MANIFESTS_BUCKET__,
    Key: key,
  });

  const resp = await s3.send( command );
  return resp.Body;

}

function put( readStream, key, isPublic = false ) {

  const ACL = isPublic ? "public-read" : 'private';
  const fullKey = `${ isPublic ? 'public' : 'private' }/${key}`;

  const params = {
    Bucket: __EXPRESSHOP_MANIFESTS_BUCKET__,
    Key: fullKey,
    Body: readStream,
    ACL
  };

  const upload = new Upload({
    client: s3,
    params,
  });

  return upload.done();

}

async function list( { num, prefix = 'public', continuationToken } ) {

  const params = {
    Bucket: __EXPRESSHOP_MANIFESTS_BUCKET__,
    MaxKeys: ( num || 50 ) + ( prefix ? 1 : 0 ) // add an extra since we will delete the folder result
  };

  if( prefix ) {
    params.Prefix = prefix;
  }
  if( continuationToken ) {
    params.ContinuationToken = continuationToken;
  }


  const command = new ListObjectsV2Command( params );
  const response = await s3.send( command );

  let manifests = response.Contents || [];

  manifests = manifests
    .map( _ => ({
      // name: folder ? _.Key.replace( new RegExp(`${folder}/`), '') : _.Key,
      name: _.Key,
      size: _.Size,
      lastModified: _.LastModified
    }) )
    .filter( _ => _.name );

  const result = {

    baseUrl: `https://${ response.Name }.s3.amazonaws.com/`,

    continuationToken: response.NextContinuationToken,

    manifests,

  };

  return result;


}