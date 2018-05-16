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

const submitListing = Promise.method(async function (listing) {
	const product = {
		title: 'foobar',
		//tags
		// template
		// manifest file
		// publish status
		// body
		// price
		// unit count
	};
	const addProductResp = await shopifyClient.addProduct(product);

	const addImageReqs = [];
	if(addProductResp) {
		for(let image of listing.lot.images) {
			addImageReqs.push(addImage(addProductResp.product.id, image));
		}
	}
	const imageResps = await Promise.all(addImageReqs);
	const response = {};
	Object.assign(response, addProductResp);
	response.images = imageResps.map(x => x.image);
	return response;
});

module.exports = {
	submitListing: submitListing,
}