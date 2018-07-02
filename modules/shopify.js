const Promise = require('bluebird');

const path = require('path');
const fs = require('fs');
const readFile = Promise.promisify(fs.readFile);

const manifests = require(path.join(__basedir, __config.modulesPath, 'manifests'));

const shopifyApi = require(path.join(__config.libDir.shopify, 'api'));

const shopifyClient = new shopifyApi.Client(__config.shopify.store);

const addImage = Promise.method(async function(productId, imageObj){
	const imageReqOptions = {
		productId: productId,
		image: await readFile(path.join(__basedir, __config.imgPath, imageObj.filename)).then(buffer=>buffer.toString('base64')),
		primary: imageObj.primary,
	};
	return shopifyClient.addProductImage(imageReqOptions);
});

//TODO: This function might be real slow. Return right away? 
const submitListing = Promise.method(async function (listing) {

	// Start the manifest promise if applicable
	const manifestP = listing.lot.unmanifested ? null : manifests.getManifestItemsForLot(listing.lot);
	const manifestItems = await manifestP;

	const productTitle = `${listing.lot.listingData.title} (${listing.lot.totalUnits} units${manifestItems.totalRetailValue ? `: $${manifestItems.totalRetailValue} estimated retail value` : ''})`;

	const product = {
		title: productTitle,
		body_html: `${productTitle}<br><br>${listing.lot.listingData.body}` + '<br><br>' + listing.bodyBoilerplate, //TODO: whitespace/newlines not formatted right. use HTML?
		template_suffix: 'manifested',
		published_at: null,
		tags: listing.shopifyTags,
		variants: [
			{
				barcode: listing.lot.handle,
				sku: listing.lot.handle,
				price: listing.shopifyPrice,
				option1: listing.lot.totalUnits,
			}
		],

		// unit count
		// weight

		//collection
	};

	const addProductResp = await shopifyClient.addProduct(product);
	const newProductId = addProductResp.product.id;

	// add images
	const addImageReqs = [];
	if(addProductResp) {
		for(let image of listing.lot.images) {
			addImageReqs.push(addImage(newProductId, image));
		}
	}

	// Set inventory tracking and SKU if requested
	const inventoryItemId = addProductResp.product.variants[0].inventory_item_id;
	const updateInventoryItemP = shopifyClient.updateInventoryItem({inventoryItemId: inventoryItemId, tracked: true, sku: listing.lot.handle});

	//Default inventory after product creation is 1. Make adjustment to inventory if needed
	let updateInventoryLevelP = Promise.resolve(null);
	if(listing.shopifyInventory>1) {
		updateInventoryLevelP = shopifyClient.getInventoryLevels({inventoryItemId: inventoryItemId }).then(resp=>{
			return shopifyClient.updateInventoryLevel({
				availableAdjustment: parseInt(listing.shopifyInventory) - 1,
				inventoryItemId: inventoryItemId,
				locationId: resp.inventory_levels[0].location_id
			});
		})
	}

	//The set of promises for this listing
	const listingPromises = [
		Promise.all(addImageReqs),
		updateInventoryItemP,
		updateInventoryLevelP,
	]

	// Schedule manifest promise if applicable
	if(!listing.lot.unmanifested) {
		const manifest = JSON.stringify(manifestItems);

		const addMetafieldP = shopifyClient.addProductMetafield({
			productId: newProductId,
			metafield: {
				namespace: 'manifest',
				key: 'json',
				value: manifest,
				value_type: 'string',
			}
		})
		listingPromises.push(addMetafieldP);
	}

	await listingPromises;
	//publish after all requests come back and return the response
	return shopifyClient.publishProduct(newProductId);
});

module.exports = {
	submitListing: submitListing,
}