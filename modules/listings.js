const boilerplate1 = 'Our items are in good condition, but may have some or all of the following properties:\n' +
		'•	Have retail stickers such as price tags or discount/store labels.\n' + 
		'•	Items may be out of box or in open boxes.\n' +
		'•	Items expired or short-dated.\n' +
		'Lot is not inspected and there is no guarantee on the variety of items or expiration dates. The total number of units is guaranteed.';

const boilerplateByAuctionType = {
	'shelf-pull': 'What are shelf-pulls? This is an industry term similar to overstock, clearance or close-outs. ' + 
			'These items have been on retail store shelves and liquidated at the end of the season, or when the store needed to make room for new stock to be displayed. ' + 
			'The reason for being removed from shelves may be as trivial as a new package design from the manufacturer (many stores are under contract to only sell items with the latest packaging). ' + 
			'Shelf pulls are unused; they are NOT customer returns. This auction is for Shelf-pull items.' + 
			'\n' + boilerplate1,
	'customer returns': 'This auction is for customer returns.' + '\n' + boilerplate1,
	'salvage': 'The lot contains units that have passed the best by date.',
};

module.exports = {
	boilerplate: boilerplateByAuctionType,
}