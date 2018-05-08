const path = require('path');

const bstockWeb = require(path.join(__config.libDir.bstock, 'bstock-web'));
const manifests = require(path.join(__basedir, __config.modulesPath, 'manifests'));

function getManifestItems(lot) {
	// return [];
}

async function submitListing(data) {
	const lot = data.lot;
	const client = new bstockWeb.Client(__config.bstock.login);

	const manifestOptions = {
		bstock: {
			Category: data.category,
			Condition: data.condition,
			Packaging: data.packaging,
		},
	};

	const submissionData = {
		shipping: data.shipping,
		manifestItems: await manifests.getManifestItemsForLot(lot, manifestOptions),
		totalUnits: lot.totalUnits,
		title: lot.listingData.title,
		description: lot.listingData.body,
		category: bstockWeb.codeMaps.category[data.category],
		condition: bstockWeb.codeMaps.condition[data.condition],
		palletIds: lot.handle,
		images: lot.images,
		startPrice: data.auctionStartPrice,
	};

	console.log('submissionData:');
	console.log(submissionData);

	return client.test(submissionData).catch(e=>console.log(e));
}


module.exports = {
	// data
	constants: bstockWeb.codeMaps,
	// functions
	submitListing: submitListing,
}