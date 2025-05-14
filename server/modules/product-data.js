const { Readable } = require('stream');

const libBarcodes = require('barcodes/lib');
const { isNumericString } = require('../helpers');

const { fromIni } = require('@aws-sdk/credential-providers');
const {
  S3Client,
} = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");

// Create a new S3 client using credentials from the specified profile
const s3 = new S3Client({
  region: 'us-east-1',
  credentials: fromIni({ profile: 'lot-commander' }),
});

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
        const fallbackData = fallbackProductDataResult.toObject().data;
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

    const params = {
      Bucket: 'expresshop-product-data-jobs',
      Key: `jobs/${ ( new Date() ).toISOString().replace(/[-:]/g, '') }.txt`,
      Body: Readable.from( barcodes.map( _ => _ + '\n' ) ),
      ACL: 'private',
      ContentType: 'text/plain',
      ContentEncoding: 'utf-8',
    };

    const upload = new Upload({
      client: s3,
      params,
    });

    return upload.done();

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
