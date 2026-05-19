const UpcItemDb = require('@wazue/upc-item-db');
const { parseListingTitle } = require('./product-data');

// Helpers

const getBestPrice = getAverageUnitPrice;

function processItem( item, markup ){
  const r = {};

  r.title = parseListingTitle(item.title).title;

  if( item.brand ) {
    r.brand = item.brand;
  }

  if( item.offers && item.offers.length ) {
    let basePrice = getBestPrice( item.offers );
    if( markup ) {
      basePrice = basePrice*( 1 + markup );
    }
    r.price = basePrice.toFixed(2);
  }

  if( item.images ) {
    r.images = item.images;
  }


  return r;
}

function getAverageUnitPrice( offers ) {
  let numOffers = 0;
  let sumPrice = 0;
  for( let i=0; i<offers.length; i++ ) {
    const offer = offers[i];
    if( offer.condition.toLowerCase() === 'new' ) {// only count "New" condition
      const curPrice = offer.list_price || offer.price || 0;
      if( curPrice ) { // ignore missing prices
        const offerUnitQuantity = parseListingTitle( offer.title ).quantity || 1;
        const curUnitPrice = curPrice / offerUnitQuantity;
        sumPrice += curUnitPrice;
        numOffers += 1;
      }
    }
  }
  return numOffers ? ( sumPrice / numOffers ) : 0;
}

//==========================================================
// Client
//==========================================================

class Client {

  constructor( { connection, settings } ) {

    this.settings = Object.assign( { connection }, settings );

    this.upcitemdb = new UpcItemDb( this.settings );

    this.connection = connection;

  }

  async getProductData( upc ) {
    let productData = {
      barcode: upc
    };

    const resp = await this.upcitemdb.fetchProductData( upc );

    if( resp && resp.item ) {
      console.log(`Product data obtained from UpcItemDb for upc ${ upc }.`);
      productData = Object.assign( productData, processItem( resp.item ) );
    }
    else {
      console.log(`No product data found in UpcItemDb for upc ${ upc }.`);
    }

    return productData;
  }

  async getProductDataFromCache( upc ) {
    return this.upcitemdb.cache.get( upc );
  }

  bulkGetProductData( barcodes ) {
    return this.upcitemdb.cache.cache.find( { upc: { $in: barcodes } } );
  }

}

module.exports = Client;