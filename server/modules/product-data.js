const { Readable } = require('stream');

const libBarcodes = require('@wazue/barcodes/lib');
const { isNumericString } = require('../helpers');
const { InvalidRequestError } = require('../errors');

const {
  S3Client,
} = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");

const s3 = new S3Client({
  region: 'us-east-1',
});

/**********************************************
 * Helper functions
 * ========================
 *
 *********/

const parseListingTitlePatterns = [
  /\(?Pack of ([0-9]+)\)?/i,
  /\(?Case of ([0-9]+)\)?/i,
  /\(?([0-9]?)[- ]?P(ac)?k\)?/i
];
function parseListingTitle( title ) {

  let quantity;

  let cleanTitle;
  if( title && process.env.PARSE_PRODUCT_TITLES_FOR_BUNDLES ) {

    for( let i=0; i < parseListingTitlePatterns.length; i++ ) {
      const match = title.match( parseListingTitlePatterns[i] );

      if( match && match[1] ) {
        quantity = match[1];
        cleanTitle = title.replace( match[0], '' ).trim();
        break;
      }
    }

  }

  return {
    title: cleanTitle || title,
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

function _priceCheck( productData ) {
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
    InternalProductData,
    traject,
    upcItemDb,
  } ) {

    Object.assign(
      this,
      {
        FallbackProductData,
        fnskuToAsin,
        InternalProductData,
        traject,
        upcItemDb,
      }
    );

  }

  async getProductDataByBarcode( barcode, { source, type } ) {

    let product;

    if( source ) {

      product = await this.getProductDataFromSource( barcode, source, type );

    }
    else {

      product = await this.getInternalProductData( barcode );

      if( !product ) {
        if ( isNumericString( barcode ) ) {
          product = await this.getProductDataByUpc( barcode );
        }
        else {
          product = await this.getProductDataByFnskuOrAsin( barcode );
        }
      }

      if( product ) {
        product.title = product.title || product.description;
      }

    }


    return {
      ...{ barcode },
      ...( product || {} )
    };
  }

  getProductDataFromSource( barcode, source, type ) {

    if( isNumericString( barcode ) ) {
      let normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'upca' );
      if( !normalizedBarcode ) {
        normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'ean' );
      }
      barcode = normalizedBarcode;
    }

    if( source === 'upcitemdb' ) {
      return this.upcItemDb.getProductData( barcode );
    }
    else if( source === 'traject' ) {
      return this.traject.fetchProductDataById( barcode, type );
    }
    else if( source === 'fnskutoasin' ) {
      return this.fnskuToAsin.fetchProductDataByIdType( barcode, type );
    }
    else {
      throw new InvalidRequestError(`Unknown data source '${ source }'`);
    }

  }

  async getProductDataByUpc( barcode ) {

    let normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'upca' );
    if( !normalizedBarcode ) {
      normalizedBarcode = libBarcodes.normalizeBarcodeByType( barcode, 'ean' );
    }

    let product;
    product = await this.traject.fetchProductDataById( normalizedBarcode, 'gtin' );

    if( !product ) {
      product = await this.upcItemDb.getProductData( normalizedBarcode );
    }

    return product;

  }

  async getProductDataByFnskuOrAsin( barcode ) {

    let product;

    if( barcode.match(/^X/) ) {  // if it begins with 'X', it's probably an FNSKU, but we check ASIN as a fallback.

      product = await this.getProductDataByFnsku( barcode );
      if( !product ) {
        product = await this.getProductDataByAsin( barcode );
      }

    }
    else { // Otherwise, it's probably ASIN but we check FNSKU as a fallback.

      product = await this.getProductDataByAsin( barcode );
      if( !product ) {
        product = await this.getProductDataByFnsku( barcode );
      }

    }

    return product;

  }

  async getProductDataByFnsku( fnsku ) {

    const fnskuItem = await this.fnskuToAsin.fetchProductDataByIdType( fnsku, 'fnsku' );

    if( !fnskuItem?.asin ) {
      return null;
    }

    return this.getProductDataByAsin( fnskuItem.asin );

  }

  async getProductDataByAsin( asin ) {

    let product;
    product = await this.traject.fetchProductDataById( asin, 'asin' );

    if( !product?.title ) {
      product = await this.fnskuToAsin.fetchProductDataByIdType( asin, 'asin' );
    }
    else if( !product.price ) {
      // if partial data is returned (no price), merge with fnskuToAsin data
      console.log(`No price found for ASIN ${ asin }, attempting to fetch from FNSKUtoASIN service...`);
      const _product = await this.fnskuToAsin.fetchProductDataByIdType( asin, 'asin' );
      product.price = _product.price;
    }

    return product?.title ? product : null;

  }

  searchForProductData( str ) {
    const results = this.traject.search( str );
    return results;
  }

  async queueProductDataFetching( barcodes ) {

    const params = {
      Bucket: 'expresshop-product-data-jobs',
      Key: `jobs/${ ( new Date() ).toISOString().replace(/[-:]/g, '') }.txt`,
      Body: Readable.from( barcodes.map( _ => _ + '\n' ) ),
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

  getInternalProductData( barcode ) {
    return this.InternalProductData.findOne( { barcode } ).lean();
  }

  saveInternalProductData( productData ) {

    if( Array.isArray( productData ) ) {

      const upsertDocs = productData.map( data => {
        return {
          updateOne: {
            filter: { barcode: data.barcode },
            update: { $set: data },
            upsert: true
          }
        };
      });

      return this.InternalProductData.bulkWrite( upsertDocs );
    }
    else {

      return this.InternalProductData.updateOne(
        { barcode: productData.barcode },
        { $set: productData },
        { upsert: true }
      );

    }

  }

  async getFallbackData( barcode ) {

    const fallbackProductDataResult = await this.FallbackProductData.findOne( {
      // this query compares `barcode` against each document's `pattern` field (compiled as a regex)
      $expr: {
        $regexMatch: {
          input: barcode,
          regex: "$pattern",
        }
      }
    } );

    let fallbackData;
    if( fallbackProductDataResult && fallbackProductDataResult.data ) {
      console.log(`Fallback product data found for barcode ${ barcode }...`);
      fallbackData = fallbackProductDataResult.getData();
    }

    return fallbackData;

  }

  async bulkGetFallbackData( barcodes ) {
    // get all fallback product data
    const fallbackDataArr = await this.FallbackProductData.find( {} );

    return barcodes.map( barcode => {

      const productData = { barcode };

      const match = fallbackDataArr.find( fallbackData => barcode.match( fallbackData.pattern ) );
      if( match ) {
        Object.assign( productData, match.getData() );
      }

      return productData;

    });

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
