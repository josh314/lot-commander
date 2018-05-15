const path = require('path');
const shopifyApi = require(path.join(__config.libDir.shopify, 'api'));

const shopifyClient = new shopifyApi.Client(__config.shopify.store);

function submitListing(listing) {

} 

module.exports = {
	submitListing: submitListing,
}