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
		title: listing.lot.listingData.title,
		body_html: listing.lot.listingData.body + '<br><br>' + listing.bodyBoilerplate, //TODO: whitespace/newlines not formatted right. use HTML?
		template_suffix: 'manifested',
		published_at: null,
		//tags
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