const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

function createLabels(opts={}) {

	const doc = new PDFDocument({ autoFirstPage: false });
	doc.fontSize(8);
	for(let i=0; i<(opts.numLabels || 1); i++) {
		doc.addPage({ 
			margin: 0, 
			size: [ opts.label.width , opts.label.height ]
		});
		let canvas = createCanvas('image');
		JsBarcode(canvas, opts.barcode.text, { 
			format: 'CODE39',
			fontsize: 20,
			height: 125 
		});

		doc
			.image(canvas.toBuffer(), 2, 15, { width: 149 })
			.text(`(${i+1} of ${opts.numLabels})`, 0, 5, { align: 'center', width: opts.label.width })
	}

	doc.end();
	return doc;
}

function generate(req,res) {
	createLabels({ 
		barcode: {
			text: decodeURIComponent(req.params.sku),
		},
		numLabels: req.params.numLabels,
		label: {
			width: 153,
			height: 72
		}
	}).pipe(res);
};

module.exports = {
	generate: generate
}