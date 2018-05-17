const Promise = require('bluebird');

const path = require('path');
const fs = require('fs');
const readFile = Promise.promisify(fs.readFile);

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
	const product = {
		title: listing.lot.listingData.title,
		body_html: listing.lot.listingData.body + '<br><br>' + listing.bodyBoilerplate, //TODO: whitespace/newlines not formatted right. use HTML?
		template_suffix: 'manifested',
		published_at: null,
		tags: listing.shopifyTags,

		// manifest file
		// price
		// unit count
		// inventory quantity -- set with new inventory API?
		// shopify manages inventory --set with new inventory API?
		// weight
		//barcode
		//collection
		// variants -- does this hold some of the above data?
	};

	//TODO: create unpublished then publish with a separate request after all other request have gone trhough successfully

	console.log(product)
	const addProductResp = await shopifyClient.addProduct(product).then( r => console.log(r) || r );
	const newProductId = addProductResp.product.id;

	// add images
	const addImageReqs = [];
	if(addProductResp) {
		for(let image of listing.lot.images) {
			addImageReqs.push(addImage(newProductId, image));
		}
	}


	const inventoryItemId = addProductResp.product.variants[0].inventory_item_id;
	// Set inventory tracking and SKU if requested
	const updateInventoryItemP = shopifyClient.updateInventoryItem({inventoryItemId: inventoryItemId, tracked: true, sku: listing.shopifySku});

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


	const imageResps = await Promise.all(addImageReqs);
	const updateInventoryItemResp = await updateInventoryItemP;
	const updateInventoryLevelResp = await updateInventoryLevelP;

	//publish after all requests come back

	return shopifyClient.publishProduct(newProductId);
});

module.exports = {
	submitListing: submitListing,
}