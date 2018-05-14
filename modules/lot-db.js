const path = require('path');

const Promise = require('bluebird');
const moment = require('moment');

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));
const inmarDb = require(path.join(__basedir, __config.modulesPath, 'inmar-db'));

const libLotDb = require(path.join(__config.libDir.lotdb, 'lotdb'));


const lotdbClient = new libLotDb.Client(__config.db.lotdb); 

function getLotById(lotId) {
	return lotdbClient.getLotById(lotId);
}

function getLotByIdApi(req, res) {
	getLotById(req.params.lotId).then(resp=>{
		res.json(resp)
	});
}

function getLots(req, res) {
	//todo: start and end dates, other search filters, sort options
	__logger.info('Lot list requested.');
	const opts = {
		sort: { createdAt: -1 },
		limit: 100,
	};
	const query = {};
	if(req.body.startDate) {
		query.createdAt = query.createdAt || {};
		query.createdAt.$gte = moment(req.body.startDate).startOf('day').toDate();
	}
	if(req.body.endDate) {
		query.createdAt = query.createdAt || {};
		query.createdAt.$lte = moment(req.body.endDate).endOf('day').toDate();
	}
	if(req.body.handle) {
		query.handle = handle;
	}
	lotdbClient.getLots(query, opts).then(resp=>{
		res.json(resp);
	})
}

function newLot(req, res) {
	const newLot = req.body;
	__logger.info(`Submitting new lot with data ${JSON.stringify(newLot)}.`);
	newLot.listings = [{ platform: 'bstock', body: ''}]
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
				// totalUnits: lot.inventory.reduce( (sum, item) => { return sum + item.quantity; }, 0),
				totalUnits: lot.totalUnits ? lot.totalUnits : 0,
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
		if(resp.error) {
			__logger.error(resp.error)
			res.json({error: 'server error.'});
		}
		else {
			res.json(resp);
		}
	})
}

function addImage(lotId, imageMetadata) {
	return lotdbClient.addImage(lotId, imageMetadata);
}

function removeImage(lotId, image) {
	return lotdbClient.removeImage(lotId, image);
}

function link3pManifestBlock(req, res, next){
	const blockId = req.body.blockId;
	inmarDb.getManifestByBlockId(blockId).then(manifest=>{
		if(!manifest) {
			const msg = 'Block Id not found.'
			const e = new Error(msg);
			e.clientMessage = msg;
			next(e);
		}
		else {
			const block = manifest.blocks.find(b => b.blockId===blockId);
			const totalUnits = block.contents.reduce((units, item) => units + item.quantity, 0);
			const linkManifestData = { dbId: manifest._id, blockId: blockId, totalUnits };
			lotdbClient.add3pManifest(req.body.lotId, linkManifestData).then(resp=>{
				res.json(resp);
			});
		}
	});
}

function markAsListed(lotId) {
	const data = {
		_id: lotId,
		status: 'Listed'
	};
	return lotdbClient.updateLot(data);
}

function deleteLot(req,res) {
	return lotdbClient.deleteLot(req.body.lotId);
}

module.exports = {
	//middleware
	getLotByIdApi: getLotByIdApi,
	getLots: getLots,
	newLot: newLot,
	editLotMetadata: editLotMetadata,
	saveManifest: saveManifest,
	getManifest: getManifest,
	setPrimaryImage: setPrimaryImage,
	deleteLot: deleteLot,
	// other functionality
	getLotById: getLotById,
	addImage: addImage,
	removeImage: removeImage,
	lotStatusEnum: lotdbClient.LotModel.statusEnum,
	lotTypeEnum: lotdbClient.LotModel.typeEnum,
	link3pManifestBlock: link3pManifestBlock,
	markAsListed: markAsListed,
};