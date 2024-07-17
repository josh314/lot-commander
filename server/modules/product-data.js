const Agenda = require('agenda');

const libBarcodes = require('barcodes/lib');


// helpers

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

  constructor( { upcItemDb, FallbackProductData, mongo } ) {

    Object.assign(
      this,
      {
        upcItemDb,
        FallbackProductData,
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

    const productData = {};

    let normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'upca' );
    if( !normalizedBarcode ) {
      normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'ean' );
    }

    const upcItemDbResult =  await this.upcItemDb.getProductData( normalizedBarcode );

    if( !upcItemDbResult.title && !upcItemDbResult.brand ) {

      const fallbackProductDataResult = await this.FallbackProductData.findOne( {
        // this query compares `normalizedBarcode` against each document's `pattern` field (compiled as a regex)
        $expr: {
          $regexMatch: {
            input: normalizedBarcode,
            regex: "$pattern",
          }
        }
      } );

      if( fallbackProductDataResult && fallbackProductDataResult.data ) {
        console.log(`Fallback product data found for barcode ${normalizedBarcode}...`);
        const fallbackData = fallbackProductDataResult.toObject().data;
        Object.assign( productData, fallbackData );
      }
    }
    else {
      Object.assign( productData, upcItemDbResult );
    }

    priceCheck( productData );

    return productData;
  }

  async queueProductDataFetching( barcodes ) {
    return this.agenda.now( "queueProductDataFetching", { barcodes } );
  }

  bulkGetProductData( barcodes ) {
    return this.upcItemDb.bulkGetProductData( barcodes );
  }

}

module.exports = $_;
