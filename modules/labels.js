const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

const labelWidth = 200;
const labelHeight = 200;

function createLabels(opts={}) {

	console.log(opts)

	const doc = new PDFDocument({ autoFirstPage: false});
	for(let i=0; i<opts.numLabels; i++) {
		doc.addPage();
		let canvas = createCanvas(opts.width, opts.height, 'image');
		let barcode = JsBarcode(canvas, opts.barcode);
		doc.text(`${i+1} of ${opts.numLabels}`);
		doc.image(canvas.toBuffer());
	}

	doc.end();
	return doc;
}

function generate(req,res) {
	createLabels({ 
		width: 200, 
		height: 200,
		barcode: decodeURIComponent(req.params.sku),
		numLabels: req.params.numLabels
	}).pipe(res);
};

module.exports = {
	generate: generate
}