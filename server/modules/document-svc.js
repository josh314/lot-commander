const {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  ListObjectsV2Command,
  PutObjectTaggingCommand,
} = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");

const s3 = new S3Client({
  region: 'us-east-1',
});

const __EXPRESSHOP_DOCUMENTS_BUCKET__ = 'expresshop-documents';

module.exports = {
  folder: type => id => `${type}-${id}`,
  addDocumentTags,
  clone,
  get,
  getDocumentTags,
  list,
  remove,
  setDocumentTags,
  store
};

async function get( { bucket, folder, name } ) {

  const command = new GetObjectCommand({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
  });

  const resp = await s3.send( command );

  return resp.Body;

}

function remove( { bucket, folder, name } ) {

  const command = new DeleteObjectCommand({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
  });
  return s3.send( command );

}

function store( { readStream, bucket, folder, name, tags } ) {

  const params = {
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
    Body: readStream,
    ACL: 'private'
  };

  const tagSet = new URLSearchParams(tags);
  const tagsetStr = tagSet.toString();
  if( tagsetStr ) {
    params.Tagging = tagsetStr;
  }

  const upload = new Upload({
    client: s3,
    params,
  });

  return upload.done();


}

async function list({ num, bucket, folder, continuationToken }) {

  const params = {
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    MaxKeys: num || 50 + ( folder ? 1 : 0 ) // add an extra since we will delete the folder result
  };

  if( folder ) {
    params.Prefix = folder;
  }
  if(continuationToken) {
    params.ContinuationToken = continuationToken;
  }

  const command = new ListObjectsV2Command( params );
  const response = await s3.send( command );

  let documents = response.Contents || [];

  documents = documents
    .map( _ => ({
      name: folder ? _.Key.replace( new RegExp(`${folder}/`), '') : _.Key,
      size: _.Size,
      updatedAt: _.LastModified
    }) )
    .filter( _ => _.name );

  const result = {

    documents,

    continuationToken: response.NextContinuationToken

  };

  return result;
}

function clone( { bucket, srcFolder, destFolder, name } ) {

  // TODO: metadata, ACL

  const command = new CopyObjectCommand({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    CopySource: `${__EXPRESSHOP_DOCUMENTS_BUCKET__}/${srcFolder}/${name}`,
    Key: `${destFolder}/${name}`
  });

  return s3.send( command );

}

function getDocumentTags( { bucket, folder, name } ) {

  const command = new GetObjectTaggingCommand({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
  });
  return s3.send( command );

}

async function addDocumentTags( { bucket, folder, name, tags } ) {

  const tagSet = await getDocumentTags( { bucket, folder, name } ).then( _ => _.TagSet );

  for( let [ Key, Value ] of Object.entries( tags ) ) {

    const found = tagSet.find( _ => _.Key === Key );

    if( found ) {
      found.Value = Value;
    }
    else {
      tagSet.push( { Key, Value } );
    }

  }

  const command = new PutObjectTaggingCommand({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
    Tagging: {
      TagSet: tagSet
    }
  });

  return s3.send( command );

}

function setDocumentTags( { bucket, folder, name, tagset } ) {


  const command = new PutObjectTaggingCommand({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
    Tagging: {
      TagSet: tagset
    }
  });

  return s3.send( command );

}