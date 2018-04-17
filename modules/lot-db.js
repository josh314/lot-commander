const path = require('path');

const Promise = require('bluebird');

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));

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

const listingBoilerplate1 = 'Our items are in good condition, but may have some or all of the following properties:\n' +
		'•	Have retail stickers such as price tags or discount/store labels.\n' + 
		'•	Items may be out of box or in open boxes.\n' +
		'•	Items expired or short-dated.\n' +
		'Lot is not inspected and there is no guarantee on the variety of items or expiration dates. The total number of units is guaranteed.';

const listingBoilerplateByAuctionType = {
	'shelf-pulls': 'What are shelf-pulls? This is an industry term similar to overstock, clearance or close-outs. ' + 
			'These items have been on retail store shelves and liquidated at the end of the season, or when the store needed to make room for new stock to be displayed. ' + 
			'The reason for being removed from shelves may be as trivial as a new package design from the manufacturer (many stores are under contract to only sell items with the latest packaging). ' + 
			'Shelf pulls are unused; they are NOT customer returns. This auction is for Shelf-pull items.' + 
			'\n' + listingBoilerplate1,
	'customer returns': 'This auction is for customer returns.' + '\n' + listingBoilerplate1,
	'salvage': 'The lot contains units that have passed the best by date.',
};

function newLot(req, res) {
	const newLot = req.body;
	__logger.info(`Submitting new lot with data ${JSON.stringify(newLot)}.`);
	newLot.listings = [{ platform: 'bstock', body: listingBoilerplateByAuctionType['shelf-pulls']}]
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

module.exports = {
	//middleware
	getLotByIdApi: getLotByIdApi,
	getLots: getLots,
	newLot: newLot,
	editLotMetadata: editLotMetadata,
	saveManifest: saveManifest,
	getManifest: getManifest,
	setPrimaryImage: setPrimaryImage,
	// deleteLot: deleteLot,
	// other functionality
	getLotById: getLotById,
	addImage: addImage,
	removeImage: removeImage,
	lotStatusEnum: lotdbClient.LotModel.statusEnum,
	lotTypeEnum: lotdbClient.LotModel.typeEnum,
};