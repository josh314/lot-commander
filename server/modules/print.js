const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');
const dayjs = require( 'dayjs' );

/*****************************************
 * Constants
 * =========
 *
 *******/

const __LABEL_DIMENSIONS__ = [
  {
    width: 162,// 72/in * 2.25 in
    height: 90, // 72/in * 1.25 in
  }
];

const __MARGIN_HORIZONTAL__ = 10;
const __MARGIN_VERTICAL__ = 5;

const __STANDARD_LABEL_PAGE__ = {
  margins: {
    top: __MARGIN_VERTICAL__,
    bottom: __MARGIN_VERTICAL__,
    left: __MARGIN_HORIZONTAL__,
    right: __MARGIN_HORIZONTAL__
  },
  size: [ __LABEL_DIMENSIONS__[0].width , __LABEL_DIMENSIONS__[0].height ]
};

const __STANDARD_BARCODE_HEIGHT__ = 125;

const unitAbbreviations = {
  'pounds': 'lbs',
  'ounces': 'oz',
  'grams': 'g',
  'kilograms': 'kg',
  'feet': 'ft',
  'inches': 'in',
  'centimeters': 'cm'
};

/*****************************************
 * helper methods
 * ==============
 *
 *******/

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

function setShippingItemDimString( doc, shippingItems, index ){
  return doc
    .fontSize( 5 )
    .font('Helvetica').text(
      `[ ${getShippingItemDimString( shippingItems[ index ] )} ] (${ index+1 } of ${ shippingItems.length })`,
      {
        align: 'center',
      }
    );
}

function addBarcode( doc, barcodeText ) {

  let canvas = createCanvas('image');
  JsBarcode(
    canvas,
    decodeURIComponent( barcodeText ),
    {
      format: 'CODE128',
      displayValue: true,
      height: __STANDARD_BARCODE_HEIGHT__,
    }
  );

  return doc
    .image(canvas.toBuffer(), {
      fit: [
        __LABEL_DIMENSIONS__[0].width -2*__MARGIN_HORIZONTAL__,
        __STANDARD_BARCODE_HEIGHT__
      ]
    });
}

function addStandardLabel( doc ) {
  return doc.addPage( __STANDARD_LABEL_PAGE__ );
}

function newShippingItemLabel( doc, shippingItems, index ) {

  addStandardLabel( doc );

  setShippingItemDimString( doc, shippingItems, index );

  addBarcode( doc, shippingItems[ index ]._id );

  return doc;
}

/*****************************************
 * Exported methods
 * ================
 *
 *******/

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
  };


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
    .moveDown();

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
  }

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
    });


  // close doc and return
  doc.end();
  return doc;
}

function createPalletLabels( palletIds, shipmentId ) {

  const labelDims = {
    width: 162,// 72/in * 2.25 in
    height: 90, // 72/in * 1.25 in
  };


  const doc = new PDFDocument({ autoFirstPage: false });
  doc.fontSize(8);


  for( const str of palletIds ) {

    doc.addPage({
      margin: 0,
      size: [ labelDims.width , labelDims.height ]
    });

    let canvas = createCanvas('image');
    JsBarcode(
      canvas,
      decodeURIComponent( str ),
      {
        height: 50,
      }
    );

    const margin = 5;
    doc
      .image(canvas.toBuffer(), margin, 15, { width: labelDims.width - 2*margin });

    if( shipmentId ) {
      doc
        .font('Helvetica').text(`Shipment ID: `, 10, 5, { width: labelDims.width, continued: true })
        .font('Helvetica-Bold').text(`${shipmentId}`, { continued: false, underline: true });
    }

  }

  doc.end();
  return doc;

}

function createPackageLabels( packages ) {


  const doc = new PDFDocument({ autoFirstPage: false });

  for( const pkg of packages ) {

    addStandardLabel( doc );
    addBarcode( doc, pkg._id );

    doc
      .fontSize(5)
      .moveDown();

    if( pkg.productTitle ) {
      doc
        .font('Helvetica').text(`Product: `, { continued: true })
        .font('Helvetica-Bold').text(`${ pkg.productTitle }`, { underline: true });
    }
    else if ( pkg.category ) {
      doc
        .font('Helvetica').text(`Category: `, { continued: true })
        .font('Helvetica-Bold').text(`${ pkg.category }`, { underline: true });
    }

    doc
      .font('Helvetica').text(`Condition: ${ pkg.condition}`, { continued: false } )
      .font('Helvetica').text(`Units: ${ pkg.units}`, { continued: false } )
      .font('Helvetica').text(`Date: `, { continued: true })
      .font('Helvetica-Bold').text(`${ dayjs().format( 'MM-DD-YYYY' ) }`, { underline: true });

  }

  doc.end();
  return doc;
}

function createPalletShippingItemsLabels( pallet ) {

  const doc = new PDFDocument({ autoFirstPage: false });

  for( let i=0; i<pallet.shippingItems.length; i++ ) {

    newShippingItemLabel( doc, pallet.shippingItems, i );
    doc.fontSize( 8 ).moveDown();

    if( pallet.toBeListed && pallet.lotNumber ) {

      doc
        .fontSize( 5 )
        .font('Helvetica').text(`Lot number: `, { continued: true })
        .font('Helvetica-Bold').text(`${pallet.lotNumber}`, { underline: true });

      doc.fontSize( 5 ).moveDown();

    }
    else {

      const printShipment = !!(pallet.shipment && pallet.shipment.handle);

      doc
        .fontSize( 5 )
        .font('Helvetica').text(`Pallet: `, { continued: true })
        .font('Helvetica-Bold').text(`${pallet.handle}`, { underline: true, continued: printShipment });


      if( printShipment ) {

        doc
          .fontSize( 5 )
          .text(`     `, { underline: false, continued: true })
          .font('Helvetica').text(`Shipment: `, { continued: true })
          .font('Helvetica-Bold').text(`${pallet.shipment.handle}`, { underline: true });

        doc.fontSize( 5 ).moveDown();
      }

    }

    doc
      .fontSize( 5 )
      .font('Helvetica').text(`Date: `, { continued: true })
      .font('Helvetica-Bold').text(`${ dayjs().format( 'MM-DD-YYYY' ) }`, { underline: true });

  }

  doc.end();
  return doc;
}

function createPalletSplitGroupLabels( splitGroup, pallet ) {

  const doc = new PDFDocument({ autoFirstPage: false });

  for( let i=0; i<splitGroup.shippingItems.length; i++ ) {

    newShippingItemLabel( doc, splitGroup.shippingItems, i );

    doc.fontSize( 3 ).moveDown();

    if( splitGroup.toBeListed && splitGroup.lotNumber ) {

      // lot number
      doc
        .fontSize( 7 )
        .font('Helvetica').text(`Lot number: `, { continued: true })
        .font('Helvetica-Bold').text(`${splitGroup.lotNumber}`, { underline: true, continued: true })
        .text(`     `, { underline: false, continued: true })
        .font('Helvetica').text(`Split group: `, { underline: false, continued: true })
        .font('Helvetica-Bold').text(`${splitGroup.label}`, { underline: true });

      doc.fontSize( 5 ).moveDown();

      doc
        .fontSize( 5 )
        .font('Helvetica').text(`Date: `, { continued: true })
        .font('Helvetica-Bold').text(`${ dayjs().format( 'MM-DD-YYYY' ) }`, { underline: true });

    } // if( splitGroup.toBeListed && splitGroup.lotNumber )
    else {

      // split group
      doc
        .fontSize( 7 )
        .font('Helvetica').text(`Split group: `, { continued: true })
        .font('Helvetica-Bold').text(`${splitGroup.label}`, { underline: true, continued: true })
        .text(`     `, { underline: false, continued: true })
        .font('Helvetica').text(`Date: `, { underline: false, continued: true })
        .font('Helvetica-Bold').text(`${ dayjs().format( 'MM-DD-YYYY' ) }`, { underline: true });

      doc.fontSize( 5 ).moveDown();

      const printShipment = !!(pallet.shipment && pallet.shipment.handle);
      // pallet id
      doc
        .fontSize( 5 )
        .font('Helvetica').text(`Pallet: `, { continued: true })
        .font('Helvetica-Bold').text(`${pallet.handle}`, { underline: true, continued: printShipment });

      if( printShipment ) {

        // Shipment
        doc
          .text(`     `, { underline: false, continued: true })
          .font('Helvetica').text(`Shipment: `, { continued: true })
          .font('Helvetica-Bold').text(`${pallet.shipment.handle}`, { underline: true });

      } // if( pallet.shipment && pallet.shipment.handle )

    }

  }

  doc.end();
  return doc;
}

function createLotShippingItemsLabels( lot ) {

  const doc = new PDFDocument({ autoFirstPage: false });

  for( let i=0; i<lot.shippingItems.length; i++ ) {

    newShippingItemLabel( doc, lot.shippingItems, i );

    doc.fontSize( 8 ).moveDown();
    doc.fontSize( 8 );

    if( lot.lotNumber ) {

      // lot number
      doc
        .font('Helvetica').text(`Lot number: `, { continued: true })
        .font('Helvetica-Bold').text(`${lot.lotNumber}`, { underline: true, continued: true });

    }
    else {

      // lot handle
      doc
        .font('Helvetica').text(`Lot: `, { continued: true })
        .font('Helvetica-Bold').text(`${lot.handle}`, { underline: true, continued: true });

    }

    doc
      .text(`     `, { underline: false, continued: true })
      .font('Helvetica').text(`Date: `, { continued: true })
      .font('Helvetica-Bold').text(`${ dayjs().format( 'MM-DD-YYYY' ) }`, { underline: true });


  }

  doc.end();
  return doc;
}

module.exports = {
  createLotShippingItemsLabels,
  createPackageLabels,
  createPalletLabels,
  createPalletShippingItemsLabels,
  createPalletSplitGroupLabels,
  createPickReceipt,

  // DEPRECATED
  // createLotLabels,
};


// DEPRECATED
// function createNumBoxesLabels(opts={}) {

//   const doc = new PDFDocument({ autoFirstPage: false });
//   doc.fontSize(8);
//   for(let i=0; i<(opts.numLabels || 1); i++) {
//     doc.addPage({
//       margin: 0,
//       size: [ opts.label.width , opts.label.height ]
//     });
//     let canvas = createCanvas('image');
//     JsBarcode(canvas, opts.barcode.text, {
//       format: 'CODE39',
//       font: "monospace",
//       fontSize: 50,
//       fontOptions: "bold",
//       height: 125
//     });

//     const margin = 5;
//     doc
//       .image(canvas.toBuffer(), margin, 15, { width: opts.label.width - 2*margin })
//       .font('Helvetica').text(`(${i+1} of  `, 0, 5, { align: 'center', width: opts.label.width, continued: true })
//       .font('Helvetica-Bold').text(`${opts.numLabels}`, { continued: true, underline: true })
//       .font('Helvetica').text(`  )`, { continued: false, underline: false, stroke: false });

//   }

//   doc.end();
//   return doc;
// }

// DEPRECATED
// function createShippingItemsLabels(opts={}) {

//   const doc = new PDFDocument({ autoFirstPage: false });
//   doc.fontSize(8);
//   for(let i=0; i<(opts.shippingItems.length || 1); i++) {
//     doc.addPage({
//       margin: 0,
//       size: [ opts.label.width , opts.label.height ]
//     });
//     let canvas = createCanvas('image');
//     JsBarcode(canvas, opts.barcode.text, {
//       format: 'CODE39',
//       font: "monospace",
//       fontSize: 50,
//       fontOptions: "bold",
//       height: 125
//     });

//     const margin = 5;
//     doc
//       .image(canvas.toBuffer(), margin, 15, { width: opts.label.width - 2*margin })
//       // .text(
//       //   `(${i+1} of ${opts.shippingItems.length}) [ ${getShippingItemDimString(opts.shippingItems[i])} ]`,
//       //   0,
//       //   5,
//       //   { align: 'center', width: opts.label.width }
//       // )
//       .font('Helvetica').text(`( ${i+1} of `, 10, 5, { width: opts.label.width, continued: true })
//       .font('Helvetica-Bold').text(`${opts.shippingItems.length}`, { continued: true, underline: true })
//       .font('Helvetica').text(` ) [ ${getShippingItemDimString(opts.shippingItems[i])} ]`, { continued: false, underline: false });

//   }

//   doc.end();
//   return doc;
// }

// DEPRECATED
// function createLotLabels(lot) {
//   const labelProps = {
//     barcode: {
//       text: decodeURIComponent(lot.handle),
//     },
//     label: {
//       width: 162,// 72/in * 2.25 in
//       height: 90, // 72/in * 1.25 in
//     }
//   };

//   if(lot.numBoxes) {
//     return createNumBoxesLabels(Object.assign(labelProps, { numLabels: lot.numBoxes}));
//   }
//   else if (lot.shippingItems && lot.shippingItems.length > 0 ) {
//     return createShippingItemsLabels(Object.assign(labelProps, { shippingItems: lot.shippingItems }));
//   }
//   else {
//     throw new Error(`Lot ${lot._id} has no shipping packages data.`);
//   }
// }