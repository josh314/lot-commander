const path = require('path');

const libInmarDb = require(path.join(__config.libDir.inmardb, 'inmar-db'));

const inmarDbClient = new libInmarDb.Client(__config.db.inmardb);

function newManifest(manifest) {
	return inmarDbClient.newManifest(manifest);
}

module.exports = {
	newManifest: newManifest,
};