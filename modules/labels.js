const path = require('path');

const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));

function createNumBoxesLabels(opts={}) {

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
      .text(`(${i+1} of ${opts.numLabels})`, 0, 5, { align: 'center', width: opts.label.width });
  }

  doc.end();
  return doc;
}

const unitAbbreviations = {
  'pounds': 'lbs',
  'ounces': 'oz',
  'feet': 'ft',
  'inches': 'in',
}

const getShippingItemDimString = (item) => {
  const dims = [];
  if(item.weight) {
    dims.push(`${item.weight} ${unitAbbreviations[item.weightUnits]}`);
  }
  if(item.height) {
    dims.push(`${item.height} ${unitAbbreviations[item.heightUnits]}`);
  }
  if(item.length) {
    dims.push(`${item.length} ${unitAbbreviations[item.lengthUnits]}`);
  }
  if(item.width ) {
    dims.push(`${item.width} ${unitAbbreviations[item.widthUnits]}`);
  }
  return dims.join(' / ');
};

function createShippingItemsLabels(opts={}) {

  const doc = new PDFDocument({ autoFirstPage: false });
  doc.fontSize(8);
  for(let i=0; i<(opts.shippingItems.length || 1); i++) {
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
      .text(`(${i+1} of ${opts.shippingItems.length})`, 0, 5, { align: 'center', width: opts.label.width })
      .text(`[${getShippingItemDimString(opts.shippingItems[i])}]`, 0, 62, { align: 'center', width: opts.label.width });
  }

  doc.end();
  return doc;
}

function createLabels(lot) {
  const labelProps = {
    barcode: {
      text: decodeURIComponent(lot.handle),
    },
    label: {
      width: 162,// 72/in * 2.25 in
      height: 90, // 72/in * 1.25 in
    }
  };

  if(lot.numBoxes) {
    return createNumBoxesLabels(Object.assign(labelProps, { numLabels: lot.numBoxes}));
  }
  else if (lot.shippingItems && lot.shippingItems.length > 0 ) {
    return createShippingItemsLabels(Object.assign(labelProps, { shippingItems: lot.shippingItems }));
  }
  else {
    throw new Error(`Lot ${lot._id} has no shipping packages data.`);
  }
}

function generate(req, res, next) {
  const lotId = req.params.lotId;
  lotdb.getLotById(lotId)
    .then(lot=>{
      if(lot) {
        createLabels(lot).pipe(res);
      }
      else {
        throw new Error(`No lot found with id ${lotId}`);
      }
    })
    .catch(e=>{
      next(e)
    });
}

module.exports = {
  generate: generate
};
