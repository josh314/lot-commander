const path = require('path');

const Promise = require('bluebird');

const libMandb = require(path.join(__config.libDir.mandb, 'mandb'));

const mandbClient = new libMandb.Client(__config.db.mandb); 


function getManifestById(manifestId) {
	return mandbClient.getManifestById(manifestId);
}

function getManifests(req, res) {
	//todo: start and end dates, other search filters, sort options
	__logger.info('Manifest list requested.');
	const query = {
		sort: { updatedAt: -1 },
		limit: 100
	};
	if(req.body.handle) {
		query.handle = handle;
	}
	mandbClient.getManifests(query).then(resp=>{
		res.json(resp);
	})
}

function submitManifest(manifest) {
	let manifestDbPromise;
	const itemList = manifest.inventory;
	const manifestSummaryStr = `${itemList.reduce((sum,item)=> sum = sum + item.quantity, 0)} units across ${itemList.length} SKUs.`;
	if(manifest._id) {
		__logger.info(`Updating manifest with id ${manifest._id}: ${manifestSummaryStr}`);
		manifestDbPromise = mandbClient.updateManifest(manifest);
	}
	else {
		__logger.info(`Submitting new manifest: ${manifestSummaryStr}`);
		manifestDbPromise = mandbClient.submitNewManifest(manifest);
	}
	return manifestDbPromise;
}

function deleteManifest(req, res) {
	const manifestId = req.params.manifestId;
	mandbClient.deleteManifest(manifestId).then(resp=>{
		res.json(resp);
	});
}

module.exports = {
	getManifestById: getManifestById,
	getManifests: getManifests,
	submitManifest: submitManifest,
	deleteManifest: deleteManifest,
};