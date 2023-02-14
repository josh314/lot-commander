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

  constructor( { upcItemDb, mongo } ) {
    this.upcItemDb = upcItemDb;

    this.agenda = new Agenda( {
      db: { collection: 'product-data-fetch-scheduled-tasks' },
      mongo,
      name: 'lot-commander',
    } );
  }

  async getProductDataByBarcode( barcode ) {

    let normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'upca' );
    if( !normalizedBarcode ) {
      normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'ean' );
    }

    return this.upcItemDb.getProductData( normalizedBarcode )
      .then( priceCheck );
  }

  async queueProductDataFetching( barcodes ) {
    return this.agenda.now( "queueProductDataFetching", { barcodes } );
  }

}

module.exports = $_;
