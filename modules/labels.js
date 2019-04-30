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
			font: "monospace",
			fontSize: 50,
			fontOptions: "bold",
			height: 125 
		});

		const margin = 5;
		doc
			.image(canvas.toBuffer(), margin, 15, { width: opts.label.width - 2*margin })
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
			width: 162,// 72/in * 2.25 in
			height: 90, // 72/in * 1.25 in
		}
	}).pipe(res);
};

module.exports = {
	generate: generate
}