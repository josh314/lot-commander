const path = require('path');

const Promise = require('bluebird');

const config = require(path.join(__basedir, 'config'));
const libMandb = require(path.join(config.libDir.mandb, 'mandb'));

const mandbClient = new libMandb.Client(config.db.mandb); 


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

function submitManifest(req, res) {
	let manifestReq;
	const itemList = req.body.manifest.inventory;
	const manifestSummaryStr = `${itemList.reduce((sum,item)=> sum = sum + item.quantity, 0)} units across ${itemList.length} SKUs.`;
	if(req.params.manifestId) {
		__logger.info(`Updating manifest with id ${req.params.manifestId}: ${manifestSummaryStr}.`);
		manifestReq = mandbClient.updateManifest(req.body.manifest);
	}
	else {
		__logger.info(`Submitting new manifest: ${manifestSummaryStr}.`);
		manifestReq = mandbClient.submitNewManifest(req.body.manifest);
	}
	manifestReq.then(resp=> { res.json(resp) } );
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