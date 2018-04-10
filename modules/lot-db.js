const path = require('path');

const Promise = require('bluebird');

const config = require(path.join(__basedir, 'config'));
const mandb = require(path.join(__basedir, config.modulesPath, 'manifest-db'));

const libLotDb = require(path.join(config.libDir.lotdb, 'lotdb'));

const lotdbClient = new libLotDb.Client(config.db.lotdb); 


function getLotById(req, res) {
	lotdbClient.getLotById(req.params.lotId).then(resp=>{
		res.json(resp)
	});
}

function getLots(req, res) {
	//todo: start and end dates, other search filters, sort options
	__logger.info('Lot list requested.');
	const query = {
		sort: { updatedAt: -1 },
		limit: 100
	};
	if(req.body.handle) {
		query.handle = handle;
	}
	lotdbClient.getLots(query).then(resp=>{
		res.json(resp);
	})
}

function newLot(req, res) {
	const newLot = req.body;
	__logger.info(`Submitting new lot with data ${JSON.stringify(newLot)}.`);
	lotdbClient.submitNewLot(newLot).then(resp=>{
		res.json(resp);
	})
}

function saveManifest(req, res) {
	console.log(JSON.stringify(req.body,null,2))
	Promise.resolve({}).then(resp=>{
		res.json(resp);
	})
}

function getManifest(req, res) {
	mandb.getManifestById(req.params.manifestId).then(resp=>{
		res.json({ manifest: resp });
	});
}

module.exports = {
	getLotById: getLotById,
	getLots: getLots,
	newLot: newLot,
	saveManifest: saveManifest,
	getManifest: getManifest,
	// deleteLot: deleteLot,
};