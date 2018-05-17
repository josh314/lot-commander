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
		variants: [
			{
				price: listing.shopifyPrice,
			}
		],
		// manifest file
		// price
		// unit count
		// weight
		//barcode
		//collection
	};

	if(listing.sku) {
		product.variants[0].sku = listing.sku;
	}

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

	await Promise.all(addImageReqs);
	await updateInventoryItemP;
	await updateInventoryLevelP;

	//publish after all requests come back and return the response
	return shopifyClient.publishProduct(newProductId);
});

module.exports = {
	submitListing: submitListing,
}