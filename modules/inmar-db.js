const path = require('path');

const libInmarDb = require(path.join(__config.libDir.inmardb, 'inmar-db'));

const inmarDbClient = new libInmarDb.Client(__config.db.inmardb);

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
	newManifest: newManifest,
	getManifestByBlockId: getManifestByBlockId,
};