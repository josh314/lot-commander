const mongoose = require('mongoose');
const axios = require('axios');
const qs = require('querystring');

const { parseListingTitle } = require('./product-data');

/**********************************************
 * Constants & helpers
 * ==========
 *
 *********/

const ID_TYPE_ENUM = [
  'asin',
  'gtin'
];

function getPrice( product ) {

  const {
    title,
    buybox_winner,
    more_buying_choices,
  } = product;

  let priceObj;
  if( buybox_winner ) {
    if( buybox_winner.rrp?.value  ) {
      priceObj = buybox_winner.rrp;
    }
    else if( buybox_winner.price ) {
      priceObj = buybox_winner.price;
    }
  }
  else if( Array.isArray(more_buying_choices) && more_buying_choices[0]?.price ) {
    priceObj = more_buying_choices[0].price;
  }

  let asinPrice;
  if( priceObj?.value ) {
    asinPrice = priceObj.value;
  }

  if( !asinPrice ) {
    return null;
  }

  const listingUnitQuantity = parseListingTitle( title ).quantity || 1;
  const price = asinPrice / listingUnitQuantity;

  return price.toFixed(2);

}

function getImages( product ) {

  const images = [
    ...[ product.main_image?.link ],
    ...[ product.image ],
    ...( product.images ? product.images.map( _ => _.link ) : [] )
  ];

  return images.filter(_=>_);
}

function getBrand( product ) {
  if( product.brand ) {
    return product.brand;
  }
  return null;
}

function processApiLookupProduct( product ) {

  const r = {
    asin: product.asin,
    title: parseListingTitle( product.title ).title,
    price: getPrice( product ),
    brand: getBrand( product ),
    images: getImages( product )
  };

  return r;
}



/**********************************************
 * Cache client
 * ============
 *
 *********/

const collectionName = 'traject-amazon-apis-cache';

// Define the schema for the cache
const cacheSchema = mongoose.Schema({
  id: { type: String, required: true },
  idType: { type: String, enum: ID_TYPE_ENUM },
  item: { type: mongoose.Schema.Types.Mixed, required: true }
}, { collection: collectionName, timestamps: true, strict: true });


class Cache {

  constructor( connection ) {

    if( !connection ){
      throw new Error('Initialize with an options object with either `connection` or `host` and `port` fields');
    }

    console.log(`Using existing connection for traject cache.`);
    this.connection = connection;

    this.cache = this.connection.model( 'Cache', cacheSchema, collectionName ); // Mongoose used to respect the collection name as stated in schema but that's dicier now

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
  constructor( { apiName, apiKey } ) {
    this.baseurl = `https://api.${ apiName }.com`;
    this.apiKey = apiKey;

    this.baseParams = {
      api_key: this.apiKey,
      amazon_domain: 'amazon.com'
    };

  }

  _request( { endpoint, params } ) {

    const reqParams = {
      ...this.baseParams,
      ...( params || {} )
    };


    const req = {
      method: 'get',
      url: `${ this.baseurl }/${ endpoint }?${ qs.stringify( reqParams ) }`,
    };

    return axios( req )
      .then( resp => resp.data )
      .catch(e => {
        if ( e.response && e.response.data ) {

          console.error( `Error fetching data from ${ this.baseurl }/${ endpoint }:` );

          const p = JSON.parse( JSON.stringify( reqParams ) );
          delete p.api_key; // don't log the API key
          console.error( `Request params: ${ JSON.stringify( p, null, 2 ) }` );
          console.error( JSON.stringify( e.response.data, null, 2) );

        }
        else {
          console.error( e.message ); // Log basic error if no detailed response
        }
        console.error( e );
        throw e;
      });

  }

  search( query ) {

    return this._request( {
      endpoint: 'request',
      params: {
        type: 'search',
        search_term: query
      }
    } );

  }

  lookup( id, idType ) {

    return this._request( {
      endpoint: 'request',
      params: {
        type: 'product',
        [ idType ]: id
      }
    } );

  }

}

/**********************************************
 * Module Interface
 * ================
 *
 *********/

class $_ {

  constructor( { api, connection, cacheTtl /* should be in milliseconds */ } ) {

    if( !api.asindataapi && !api.rainforestapi ) {
      throw new Error('You must provide either `asindataapi` or `rainforestapi` API key');
    }

    const apiName = api.asindataapi ? 'asindataapi' : 'rainforestapi';
    const { apiKey } = api[ apiName ];

    this.api = new ApiClient( { apiName, apiKey } );

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

    let result;
    if( cachedResult ) {
      result = cachedResult.item;
      resp.cache.hit = true;
    }
    else {

      try {
        const apiResp = await this.api.lookup( id, idType );
        if( apiResp && apiResp.product ) {
          result = apiResp.product;
        }
      }
      catch (e) {
        'no-op';
      }

      if( result && this.cache && ( !this.cache.hit || forceCacheRefresh ) ) {

        // for gtin fetches, we also cache by asin if present
        if( idType === 'gtin' && result.asin ) {
          await this.cache.store( result.asin, 'asin', result );
        }

        await this.cache.store( id, idType, result );
        resp.cache.store = true;

      }

    }

    if( result ) {
      resp.item = processApiLookupProduct( result );
    }

    return resp;

  }

  async fetchProductDataById( id, idType ) {
    const cacheableData = await this.fetchCacheableData( id, idType );
    return cacheableData.item;
  }

  async search( query ) {

    let results = [];

    const resp = await this.api.search( query );

    if( resp?.search_results ) {
      results = resp.search_results.map( sr => ({
        title: sr.title,
        brand: sr.brand,
        asin: sr.asin,
        image: sr.image,
        price: sr.price?.value,
        link: sr.link,
      }));
    }

    return results;

  }

}


module.exports = $_;