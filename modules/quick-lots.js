const boilerplate = [
	{
		handlePrefix: 'GM',
		name: 'General Merchandise',
		template: {
			type: 'shelf-pull',
			totalUnits: 400,
			listingData: {
				title: 'Brand Name General Merchandise',
				body: 'some shizz'
			},
		} 
	},
	{
		handlePrefix: 'GM',
		name: 'General Merchandise',
		template: {
			type: 'customer returns',
			totalUnits: 400,
			listingData: {
				title: 'Brand Name General Merchandise',
				body: 'some shizz'
			},
		} 
	},
	{
		handlePrefix: 'CS',
		name: 'Cosmetics',
		template: {
			type: 'shelf-pull',
			totalUnits: 400,
			listingData: {
				title: 'Brand Name Cosmetics',
				body: 'some shizz'
			},
		} 
	},
	{
		handlePrefix: 'CS',
		name: 'Cosmetics',
		template: {
			type: 'salvage',
			totalUnits: 400,
			listingData: {
				title: 'Brand Name Cosmetics',
				body: 'some shizz'
			},
		} 
	},
	{
		handlePrefix: 'VT',
		name: 'Vitamins & Supplements',
		template: {
			type: 'salvage',
			totalUnits: 400,
			listingData: {
				title: 'Brand Name Vitamins & Supplements',
				body: 'some shizz'
			},
		} 
	},
	{
		handlePrefix: 'PC',
		name: 'Personal Care',
		template: {
			type: 'shelf-pull',
			totalUnits: 400,
			listingData: {
				title: 'Brand Name Personal Care',
				body: 'some shizz'
			},
		} 
	},
	{
		handlePrefix: 'NP',
		name: 'Vitamins & Supplements',
		template: {
			type: 'shelf-pull',
			totalUnits: 400,
			listingData: {
				title: 'Brand Name Nail Polish',
				body: 'some shizz'
			},
		} 
	},
];

module.exports = {
	boilerplate: boilerplate,
}