const mongoose = require('mongoose');
const axios = require('axios');

const { parseListingTitle, parseMoneyAsNumber } = require('./product-data');

/**********************************************
 * Constants
 * ==========
 *
 *********/

const BASE_URL = 'https://ato.fnskutoasin.com/api/v1';
const MAX_ATTEMPTS = 10;
const SLEEP_TIME_MS = 2000;

const ID_TYPE_ENUM = [
  'fnsku',
  'asin'
];

const IMAGE_KEYS = [
  'imageOneUrl',
  'imageTwoUrl',
  'imageThreeUrl',
  'imageFourUrl',
  'imageFiveUrl',
  'imageSixUrl',
];

/**********************************************
 * Helper functions
 * ========================
 *
 *********/

function getPrice( asinItem, markup ) {

  const price = asinItem.retailPrice || asinItem.price;
  if( price ) {
    let basePrice = parseMoneyAsNumber( price );

    const listingUnitQuantity = parseListingTitle( asinItem.title ).quantity || 1;
    basePrice = basePrice / listingUnitQuantity;

    if( markup ) {
      basePrice = basePrice*( 1 + markup );
    }
    return basePrice.toFixed(2);
  }

}

function processItem( asinItem, markup ) {
  const r = {};

  r.asin = asinItem.asin;
  r.title = parseListingTitle( asinItem.title ).title;
  r.price = getPrice( asinItem, markup );

  if( asinItem.images ) {
    r.images = asinItem.images;
  }

  r.images = [];
  for( let key of IMAGE_KEYS ) {
    if( asinItem[key] ) {
      r.images.push( asinItem[key] );
    }
  }

  return r;
}


/**********************************************
 * Cache client
 * ============
 *
 *********/

// Define the schema for the cache
const cacheSchema = mongoose.Schema({
  id: { type: String, required: true },
  idType: { type: String, enum: ID_TYPE_ENUM },
  item: { type: mongoose.Schema.Types.Mixed, required: true }
}, { collection: 'fnsku-to-asin-cache', timestamps: true, strict: true });


class Cache {

  constructor( connection ) {

    if( !connection ){
      throw new Error('Initialize with an options object with either `connection` or `host` and `port` fields');
    }

    console.log(`Using existing connection for fnsku-to-asin-cache.`);
    this.connection = connection;

    this.cache = this.connection.model( 'Cache', cacheSchema, 'fnsku-to-asin-cache' ); // Mongoose used to respect the collection name as stated in schema but that's dicier now

  }

  closeConn() {
    return this.connection.close();
  }

  async get( id, expiryDate ) {

    let cacheHit = await this.cache.findOne( { id } );

    if( cacheHit && expiryDate ) {

      if( cacheHit.updatedAt < expiryDate ) {
        cacheHit = null;
      }

    }

    return cacheHit;

  }

  store( id, idType, item ) {

    return this.cache.findOneAndUpdate(
      // "find" condition
      { id },
      // Update document
      {
        id,
        idType,
        item
      },
      //Options
      {
        new: true, // return the new version of the document, not the old version
        upsert: true, // Create if record with that upc does not already exist
      }
    );

  }

}

/**********************************************
 * API client
 * ============
 *
 *********/

class ApiClient {

  constructor( { apiKey } ) {

    const headers = { 'accept': 'application/json', 'api-key': apiKey };

    this.axios = axios.create({
      baseURL: BASE_URL,
      headers: headers
    });

  }

  async request( { endpoint, method = 'GET', params, body } ) {

    const req = {

      method,

      url: endpoint,

      params,

      responseType: 'json'

    };

    if( body ) {
      req.data = body;
    }


    try {
      const resp = await this.axios( req );
      // console.log(resp)
      return resp.data.data;
    }
    catch( e ) {
      console.error(e);
      if(e.response && e.response.data) {
        console.log(JSON.stringify(e.response.data, null, 2));
      }
      throw e;
    }

  }

  addOrGetFnskuScan( fnsku ) {
    return this.request( {
      method: 'POST',
      endpoint: '/ScanTask/AddOrGet',
      body: {
        barcode: fnsku
      }
    } );

  }

  getFnskuScan( fnsku ) {
    return this.request( {
      endpoint: '/ScanTask/GetMyByBarCode',
      params: {
        barcode: fnsku
      }
    } );
  }

  addOrGetAsin( asin ) {
    return this.request( {
      method: 'POST',
      endpoint: '/InfoTask/AddOrGet',
      body: {
        asin
      }
    } );

  }

  getAsin( asin ) {
    return this.request( {
      endpoint: '/InfoTask/GetMyByBarCode',
      params: {
        asin
      }
    } );
  }

  async pollFnskuScan( fnsku ) {

    const addOrGetResp = await this.addOrGetFnskuScan( fnsku );

    if( addOrGetResp.asin ) {
      return addOrGetResp;
    }
    else {

      const resp = {};

      for( let i=0; i<MAX_ATTEMPTS; i++ ) {

        const getResponse = await this.getFnskuScan( fnsku );

        if( getResponse.asin ) {
          resp.asin = getResponse.asin;
          break;
        }

        await new Promise( resolve => setTimeout( resolve, SLEEP_TIME_MS ) );

      }

      return resp;
    }

  }

  async pollAsin( asin ) {

    const addOrGetResp = await this.addOrGetAsin( asin );


    if( addOrGetResp.taskState === 1 ) {
      return addOrGetResp;
    }
    else {

      const resp = {};

      for( let i=0; i<MAX_ATTEMPTS; i++ ) {

        const getResponse = await this.getAsin( asin );

        if( getResponse.taskState === 1 ) {
          Object.assign( resp, getResponse );
          break;
        }

        await new Promise( resolve => setTimeout( resolve, SLEEP_TIME_MS ) );

      }

      return resp;
    }

  }

}

/**********************************************
 * Module Interface
 * ================
 *
 *********/

class $_ {

  constructor( { apiKey, limiter, connection, cacheTtl /* should be in milliseconds */ } ) {

    this.api = new ApiClient( { apiKey, limiter } );

    this.cache = new Cache( connection );

    this.cacheTtl = cacheTtl;

  }

  async fetchCacheableData( id, idType, cacheTtl = this.cacheTtl /* should be in milliseconds. */, forceCacheRefresh = false ) {

    const resp = {
      id,
      idType,
      cache: {
        hit: false,
        store: false
      },
    };

    let cachedResult;

    if( cacheTtl === 0 ) { // force refresh by not even asking the cache

      'no-op';

    }
    else if( cacheTtl ) {

      const now = new Date();
      const expiryTime = now.getTime() - cacheTtl;
      const expiryDate = new Date( expiryTime );

      cachedResult = await this.cache.get( id, expiryDate );

    }
    else { // get the cache no matter what age. If this.cacheTtl exists, you will have to call this function with cacheTtl = null for this branch

      cachedResult = await this.cache.get( id );

    }

    if( cachedResult ) {
      resp.item = cachedResult.item;
      resp.cache.hit = true;
    }
    else {

      const pollFn = idType === 'asin' ? this.api.pollAsin( id ) : this.api.pollFnskuScan( id );

      const item = await pollFn;
      resp.item = item;

      // if( asin ) {

      if( this.cache && ( !this.cache.hit || forceCacheRefresh ) ) {

        // This is true if an ASIN was submitted when the FNSKU query was expected. That's legal to do but shouldn't be cached
        const isFnskuQueryForAsin = idType === 'fnsku' && ( !item.asin || ( item.barCode === item.asin ) );
        const isEmptyAsinResult = idType === 'asin' && !item.title;

        if( !isFnskuQueryForAsin && !isEmptyAsinResult ) {

          await this.cache.store( id, idType, item );
          resp.cache.store = true;

        }

      }

    }

    return resp;

  }

  async fetchProductData( fnskuOrAsin ) {

    const productData = {
      barcode: fnskuOrAsin
    };

    const { item: fnskuItem } = await this.fetchCacheableData( fnskuOrAsin, 'fnsku' );

    let asin;
    if( fnskuItem && fnskuItem.asin ) {
      console.log(`Found ASIN ${ fnskuItem.asin } for FNSKU ${ fnskuOrAsin }...`);
      asin = fnskuItem.asin;
    }
    else {
      asin = fnskuOrAsin;
    }

    const { item: asinItem } = await this.fetchCacheableData( asin, 'asin' );
    Object.assign( productData, processItem( asinItem ) );

    return productData;
  }
}


module.exports = $_;