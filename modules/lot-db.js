const path = require('path');

const Promise = require('bluebird');

const config = require(path.join(__basedir, 'config'));
const mandb = require(path.join(__basedir, config.modulesPath, 'manifest-db'));

const libLotDb = require(path.join(config.libDir.lotdb, 'lotdb'));

const lotdbClient = new libLotDb.Client(config.db.lotdb); 


function getLotById(lotId) {
	return lotdbClient.getLotById(lotId);
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

module.exports = {
	getLotById: getLotById,
	getLots: getLots,
	newLot: newLot,
	// deleteLot: deleteLot,
};