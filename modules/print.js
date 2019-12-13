const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

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
      .font('Helvetica').text(`(${i+1} of  `, 0, 5, { align: 'center', width: opts.label.width, continued: true })
      .font('Helvetica-Bold').text(`${opts.numLabels}`, { continued: true, underline: true })
      .font('Helvetica').text(`  )`, { continued: false, underline: false, stroke: false });

  }

  doc.end();
  return doc;
}

const unitAbbreviations = {
  'pounds': 'lbs',
  'ounces': 'oz',
  'grams': 'g',
  'kilograms': 'kg',
  'feet': 'ft',
  'inches': 'in',
  'centimeters': 'cm'
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
      // .text(
      //   `(${i+1} of ${opts.shippingItems.length}) [ ${getShippingItemDimString(opts.shippingItems[i])} ]`,
      //   0,
      //   5,
      //   { align: 'center', width: opts.label.width }
      // )
      .font('Helvetica').text(`( ${i+1} of `, 10, 5, { width: opts.label.width, continued: true })
      .font('Helvetica-Bold').text(`${opts.shippingItems.length}`, { continued: true, underline: true })
      .font('Helvetica').text(` ) [ ${getShippingItemDimString(opts.shippingItems[i])} ]`, { continued: false, underline: false });

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

function createPickReceipt(order) {
  // Layout dimensions

  const label = {
    width: 288,// 72/in * 4 in
    height: 432, // 72/in * 6 in
  };

  const margin = 16;

  const sections = {
    barcode: {
      width: label.width - 2 * margin,
      height: label.height/4
    }
  }


  // Initialize PDF document

  const doc = new PDFDocument({ autoFirstPage: false });
  doc.fontSize(8);
  doc.addPage({ 
    margin: margin, 
    size: [ label.width , label.height ]
  });

  doc
    .fontSize(24)
    .text(
      `Order ${order.orderNumber}`,
      {
        align: 'center',
        underline: true
      }
    )
    .fontSize(11)
    .moveDown();

  if(order.orderDate) {
    doc.text(`Order date: ${order.orderDate}`);
  }
    // .moveDown()
  doc
    .text(`Pick date: ${order.pickDate}`)
    .moveDown()

    // .path(`M ${margin}, ${sections.barcode.height + margin} h ${sections.barcode.width} Z`).stroke()
  for(let i=0; i<order.items.length; i++) {
    const item = order.items[i];
    doc.fontSize(12).text(`${i+1}`, { underline: true });
    doc.moveDown(.25);
    doc.fontSize(8).text(`${item.sku ? item.sku : '[ NO SKU ]'}`);
    doc.moveDown(.25);
    doc.text(`${item.title}`, { 
      // ellipsis: true,
      // lineBreak: false
    });
    doc.moveDown(.25);
    if( item.numBoxes ) {
      doc.text(`Packages: ${item.numBoxes}`);
    }
    else if( item.shippingItems && item.shippingItems.length ) {
      doc.text(`Packages:`);
      doc.list( item.shippingItems.map( getShippingItemDimString ) );
    }
    doc.moveDown();
  };

  // Create and add barcode
  const barcodeText = order.orderNumber;
  let canvas = createCanvas('image');
  JsBarcode(canvas, barcodeText, { 
    format: 'CODE39',
    displayValue: false,
    // font: "monospace",
    // fontSize: 25,
    // fontOptions: "bold",
    height: 65
  });

  doc
    .image(canvas.toBuffer(), {
      fit: [ sections.barcode.width, sections.barcode.height ],
      align: 'center',
      valign: 'center'
    })


  // close doc and return
  doc.end();
  return doc;
}

module.exports = {
  createLabels: createLabels,
  createPickReceipt: createPickReceipt
};
