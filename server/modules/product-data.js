const Agenda = require('agenda');

const libBarcodes = require('barcodes/lib');
const { isNumericString } = require('../helpers');

/**********************************************
 * Helper functions
 * ========================
 *
 *********/

function cleanTitle(title) {
  //TODO
  return title;
}

const parseListingTitlePatterns = [
  /(.*?)Pack of ([0-9]+)/i,
  /(.*?)Case of ([0-9]+)/i,
  /(.*?)([0-9]?)[- ]?P(ac)?k/i
];
function parseListingTitle( title ) {

  let quantity;

  if( title ) {

    for( let i=0; i < parseListingTitlePatterns.length; i++ ) {
      const match = title.match( parseListingTitlePatterns[i] );
      if( match && match[2] ) {
        quantity = match[2];
        break;
      }
    }

  }

  return {
    title: cleanTitle( title ),
    quantity: parseInt( quantity ) || 1
  };
}

function parseMoneyAsNumber( moneyString ) {
  return parseFloat( moneyString.replace(/[^0-9.]+/g,"") );
}


function fillerPrice() {
  const max = 16;
  const min = 11;
  return Math.floor(Math.random() * (max - min) ) + min + 0.99;
}

function priceCheck( productData ) {
  if( !productData.price ) {
    productData.price = fillerPrice();
  }
  return productData;
}

// Main class

class $_ {

  constructor( {
    FallbackProductData,
    fnskuToAsin,
    mongo,
    upcItemDb,
  } ) {

    Object.assign(
      this,
      {
        FallbackProductData,
        fnskuToAsin,
        upcItemDb,
      }
    );

    this.agenda = new Agenda( {
      db: { collection: 'product-data-fetch-scheduled-tasks' },
      mongo,
      name: 'lot-commander',
      disableAutoIndex: true,
    } );

  }

  async getProductDataByBarcode( barcode ) {

    let product;
    if ( isNumericString( barcode ) ) {
      product = await this.getProductDataByUpc( barcode );
    }
    else {
      product = await this.getProductDataByFnskuOrAsin( barcode );
    }

    if( !product.title && !product.brand ) {

      const fallbackProductDataResult = await this.FallbackProductData.findOne( {
        // this query compares `barcode` against each document's `pattern` field (compiled as a regex)
        $expr: {
          $regexMatch: {
            input: barcode,
            regex: "$pattern",
          }
        }
      } );

      if( fallbackProductDataResult && fallbackProductDataResult.data ) {
        console.log(`Fallback product data found for barcode ${ barcode }...`);
        const fallbackData = fallbackProductDataResult.getData();
        Object.assign( product, fallbackData );
      }
    }

    priceCheck( product );

    return product;
  }

  async getProductDataByUpc( barcode ) {

    let normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'upca' );
    if( !normalizedBarcode ) {
      normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'ean' );
    }

    return this.upcItemDb.getProductData( normalizedBarcode );

  }

  async getProductDataByFnskuOrAsin( barcode ) {

    return this.fnskuToAsin.fetchProductData( barcode );

  }

  async queueProductDataFetching( barcodes ) {
    return this.agenda.now( "queueProductDataFetching", { barcodes } );
  }

  bulkGetProductData( barcodes ) {
    return this.upcItemDb.bulkGetProductData( barcodes );
  }

}

// add static methods to the class
Object.assign(
  $_,
  {
    parseListingTitle,
    parseMoneyAsNumber,
  }
);

module.exports = $_;
