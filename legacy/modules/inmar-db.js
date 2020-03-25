const path = require('path');

const libInmarDb = require('inmar/inmar-db');

const inmarDbClient = new libInmarDb.Client( { connection: __connections.inmar } );


function newManifest(manifest) {
  return inmarDbClient.newManifest(manifest);
}

function getManifestByBlockId(blockId) {
  return inmarDbClient.getManifestByBlockId(blockId);
}

function getBlockByBlockId(blockId) {
  return getManifestByBlockId(blockId).then(manifest=>{
    if(!manifest) {
      return;
    }

    return manifest.blocks.find(block => block.blockId===blockId);
  });
}

module.exports = {
  // api
  newManifest: newManifest,
  getManifestByBlockId: getManifestByBlockId,
  getBlockByBlockId: getBlockByBlockId,
  // other
  priceTypeEnum: inmarDbClient.InmarManifest.priceTypeEnum,
};