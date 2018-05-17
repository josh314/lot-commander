const path = require('path');

const Promise = require('bluebird');

const lotDb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const bstock = require(path.join(__basedir, __config.modulesPath, 'bstock'));
const shopify = require(path.join(__basedir, __config.modulesPath, 'shopify'));

// const boilerplate1 = 'Our items are in good condition, but may have some or all of the following properties:\n' +
// 		'•	Have retail stickers such as price tags or discount/store labels.\n' + 
// 		'•	Items may be out of box or in open boxes.\n' +
// 		'•	Items expired or short-dated.\n' +
// 		'Lot is not inspected and there is no guarantee on the variety of items or expiration dates. The total number of units is guaranteed.';

// const boilerplateByLotType = {
// 	'shelf-pull': 'What are shelf-pulls? This is an industry term similar to overstock, clearance or close-outs. ' + 
// 			'These items have been on retail store shelves and liquidated at the end of the season, or when the store needed to make room for new stock to be displayed. ' + 
// 			'The reason for being removed from shelves may be as trivial as a new package design from the manufacturer (many stores are under contract to only sell items with the latest packaging). ' + 
// 			'Shelf pulls are unused; they are NOT customer returns. This auction is for Shelf-pull items.' + 
// 			'\n' + boilerplate1,
// 	'customer returns': 'This auction is for customer returns.' + '\n' + boilerplate1,
// 	'salvage': 'The lot contains units that have passed the best by date.',
// };

const conditionBoilerplateListItems = [
    'Have retail stickers such as price tags or discount/store labels.', 
    'Items may be out of box or in open boxes.',
	'Items expired or short-dated.',
];

// function getBstockBodyBoilerplate(lotType) {

// }

// function getShopifyBodyBoilerplate(lotType) {

// }

// function getBodyBoilerplate(marketplace, lotType) {
// 	if(marketplace=='bstock')
// 		return getBstockBodyBoilerplate(lotType);

// 	if(marketplace=='shopify')
// 		return getShopifyBodyBoilerplate(lotType);
// }

// const conditionBoilerplateListJoin = {
// 	text: (acc, item) => acc + '' + ,
// 	html: (acc, item) => ,
// };


function getBodyBoilerplate(format) {

	const bp = ((f)=>{
		if(f=='text') {
			return {
				newline: "\n",
				prefix: "•	",
				terminator: "\n",
			};
		}
		else if(f=='html') {
			return {
				newline: "<br>",
				prefix: "<li>",
				terminator: "</li>",
			};
		}
		else return '';
	})(format);



	const boilerplateList = 'Our items are in good condition, but may have some or all of the following properties:' + bp.newline + (format=='html'? '<ul>' : '') +
							conditionBoilerplateListItems.reduce((list, line) => list + bp.prefix + line + bp.terminator, '') + (format=='html'? '</ul>' : '') +
							'Lot is not inspected and there is no guarantee on the variety of items or expiration dates. The total number of units is guaranteed.'

	const boilerplateByLotType = {
		'shelf-pull': 'What are shelf-pulls? This is an industry term similar to overstock, clearance or close-outs. ' + 
				'These items have been on retail store shelves and liquidated at the end of the season, or when the store needed to make room for new stock to be displayed. ' + 
				'The reason for being removed from shelves may be as trivial as a new package design from the manufacturer (many stores are under contract to only sell items with the latest packaging). ' + 
				'Shelf pulls are unused; they are NOT customer returns. This lot is composed of Shelf-pull items.' + 
				bp.newline + boilerplateList,
		'customer returns': 'This lot is composed of customer returned items.' + bp.newline + boilerplateList,
		'salvage': 'The lot contains units that have passed the best by date.',
	};

	return boilerplateByLotType;
}

const submit = Promise.method(async function(req, res, next) {
	if(req.body.lotId) {
		const listing = req.body.listing;
		listing.lot = await lotDb.getLotById(req.body.lotId);
		if(!listing.lot.images.length) {
			const e = new Error(`No listing created for lot ${listing.lot.handle} (id: ${listing.lot._id}): No images.`);
			e.clientMessage ='Please add images to this lot before submission.';
			next(e);
		}

		const boilerplateFormat = ((mp)=>{
			if(mp=='bstock') return 'text';
			else if(mp=='shopify') return 'html';
			else return '';
		})(listing.marketplace);

		const boilerplate = getBodyBoilerplate(boilerplateFormat);

		listing.bodyBoilerplate = boilerplate[listing.lot.type] ? boilerplate[listing.lot.type] : '';

		let resp;
		if(listing.marketplace==='bstock') {
			try {
				resp = await bstock.submitListing(listing);
			}
			catch (e) {
				console.log(e);
				next(e);
			}
		}
		else if(listing.marketplace==='shopify') {
			try {
				resp = await shopify.submitListing(listing);
			}
			catch (e) {
				console.log(e);
				next(e);
			}
		}
		else {
			next(new Error('Invalid marketplace.'));
		}
		res.json(resp); 
	}
	else {
		const e = new Error('No lotId.');
		e.clientMessage ='No lotId submitted';
		next(e);
	}
});

module.exports = {
	//functions
	submit: submit,	// data
	boilerplate: getBodyBoilerplate('text'),
}