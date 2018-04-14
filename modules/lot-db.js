const path = require('path');

const Promise = require('bluebird');

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));

const libLotDb = require(path.join(__config.libDir.lotdb, 'lotdb'));

const lotdbClient = new libLotDb.Client(__config.db.lotdb); 


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

function editLotMetadata(req, res) {
	const lotData = req.body;
	lotData._id = req.params.lotId;
	lotdbClient.updateLot(lotData).then(resp=>{
		res.json(resp);
	})
}

function saveManifest(req, res) {
	console.log(JSON.stringify(req.body,null,2))
	// save inventoy to manifest db
	// if successful, update lot db
	const lot = req.body.lot;
	const manifest = {
		_id: lot.manifestId,
		handle: lot.handle,
		inventory: lot.inventory,
	}
	mandb.submitManifest(manifest)
	.then(mandbResp=>{
		if(mandbResp) {
			const lotUpdate = {
				_id: lot._id,
				totalUnits: lot.inventory.reduce( (sum, item) => { return sum + item.quantity; }, 0),
				manifestId: mandbResp._id,
			}
			return Promise.join(mandbResp, lotdbClient.updateLot(lotUpdate))
		}
	})
	.then(resp=>{
		res.json(resp);
	})
}

function getManifest(req, res) {
	mandb.getManifestById(req.params.manifestId).then(resp=>{
		res.json({ manifest: resp });
	});
}

function setPrimaryImage(req, res) {
	lotdbClient.setPrimaryImage(req.body.lotId, req.body.primaryImage).then(resp=>{
		if(!resp.error) {
			res.json({error: 'server error.'});
		}
		else {
			res.json(resp);
		}
	})
	.catch(e=>{
		res.json({ error: e})
	})
}

function addImage(lotId, imageMetadata) {
	return lotdbClient.addImage(lotId, imageMetadata);
}

module.exports = {
	//middleware
	getLotById: getLotById,
	getLots: getLots,
	newLot: newLot,
	editLotMetadata: editLotMetadata,
	saveManifest: saveManifest,
	getManifest: getManifest,
	setPrimaryImage: setPrimaryImage,
	// deleteLot: deleteLot,
	// other functionality
	addImage: addImage,
	lotStatusEnum: lotdbClient.LotModel.statusEnum,
};