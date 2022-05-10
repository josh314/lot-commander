const aws = require('aws-sdk');
aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'lot-commander'});
const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  region: 'us-east-1'
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

function get( { bucket, folder, name } ) {
  return s3.getObject({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
  })
    .createReadStream();
}

function remove( { bucket, folder, name } ) {

  return s3.deleteObject({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
  }).promise();

}

function store( { readStream, bucket, folder, name, tags } ) {

  const req = {
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
    Body: readStream,
    ACL: 'private'
  };

  const tagSet = new URLSearchParams(tags);
  const tagsetStr = tagSet.toString();
  if( tagsetStr ) {
    req.Tagging = tagsetStr;
  }

  return s3.upload( req ).promise();
    
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

  const response = await s3.listObjectsV2(params).promise();

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
  return s3.copyObject({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    CopySource: `${__EXPRESSHOP_DOCUMENTS_BUCKET__}/${srcFolder}/${name}`,
    Key: `${destFolder}/${name}`
  })
    .promise();
}

function getDocumentTags( { bucket, folder, name } ) {
  return s3.getObjectTagging({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
  })
    .promise();
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

  return s3.putObjectTagging({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
    Tagging: {
      TagSet: tagSet
    }
  }).promise();

}

function setDocumentTags( { bucket, folder, name, tagset } ) {
  return s3.putObjectTagging({
    Bucket: bucket || __EXPRESSHOP_DOCUMENTS_BUCKET__,
    Key: folder ? `${folder}/${name}` : name,
    Tagging: {
      TagSet: tagset
    }
  }).promise();
}