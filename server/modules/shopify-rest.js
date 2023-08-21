const axios = require('axios');
const qs = require('node:querystring');

class Client {

  constructor( {
    storeUrl,
    apiKey,
    accessToken,
    apiVersion
  } ) {

    Object.assign( this , { storeUrl, apiKey, accessToken, apiVersion } );

    this.authHeader = {
      'X-Shopify-Access-Token': accessToken
    };

  }

  request( { method = 'GET', endpoint, body, params, headers } ) {

    const url = `https://${ this.storeUrl }/admin/${ this.apiVersion ? `api/${this.apiVersion}/` : '' }${ endpoint }${ params ? `?${ qs.stringify( params ) }` : ''}`;

    const req = {
      method,
      url,
      headers: headers ? Object.assign( headers, this.authHeader ) : this.authHeader
    };

    if( body ) {
      req.data = body;
    }

    return axios( req ).then( resp => resp.data );

  }

  getProduct( productId ) {

    const endpoint = `products/${ productId }.json`;

    return this.request( {
      method: 'GET',
      endpoint,
    } );

  }


  getProductVariant( productVariantId ) {

    const endpoint = `variants/${ productVariantId }.json`;

    return this.request( {
      method: 'GET',
      endpoint,
    } );

  }

  getMetafieldsByOwnerIdAndType( ownerId, type ) {

    const endpoint = `${type}/${ownerId}/metafields.json`;

    return this.request( {
      method: 'GET',
      endpoint,
    } );

  }

  createProduct( product ) {

    const endpoint = `products.json`;

    const body = { product };

    return this.request( {
      method: 'POST',
      endpoint,
      body
    } );

  }

  addProductImage( productId, imageBuffer, primary ) {

    const endpoint = `products/${productId}/images.json`;

    const body = {
      image: {
        attachment: imageBuffer.toString('base64')
      }
    };

    if( primary ) {
      body.image.position = 1;
    }

    return this.request( {
      method: 'POST',
      endpoint,
      body
    } );

  }

  trackSkuInventoryItem( sku, inventoryItemId ) {

    const inventory_item = {
      sku,
      tracked: true,
      id: inventoryItemId
    };

    return this.request( {
      method: 'PUT',
      endpoint: `inventory_items/${ inventoryItemId }.json`,
      body: { inventory_item }
    } );

  }

  getInventoryLevels( inventoryItemId ) {

    const endpoint = `inventory_levels.json`;

    return this.request( {
      method: 'GET',
      endpoint,
      params: {
        inventory_item_ids: inventoryItemId
      }
    } );

  }

  async updateInventoryLevel( inventoryItemId, amount ) {

    const { inventory_levels } = await this.getInventoryLevels( inventoryItemId );

    return this.request( {
      method: 'POST',
      endpoint: `inventory_levels/adjust.json`,
      body: {
        inventory_item_id: inventoryItemId,
        location_id: inventory_levels[0].location_id,
        available_adjustment: amount
      }
    } );

  }

  addProductMetafield( productId, { namespace, key, value, type } ) {

    const endpoint = `products/${ productId }/metafields.json`;

    const metafield = {
      namespace,
      key,
      value,
      type
    };

    return this.request( {
      method: 'POST',
      endpoint,
      body: { metafield }
    } );

  }

  addProductVariantMetafield( productId, productVariantId, { namespace, key, value, type } ) {

    const endpoint = `products/${ productId }/variants/${ productVariantId }/metafields.json`;

    const metafield = {
      namespace,
      key,
      value,
      type
    };

    return this.request( {
      method: 'POST',
      endpoint,
      body: { metafield }
    } );

  }

  listOrders( params ) {

    return this.request( {
      method: 'GET',
      endpoint: `orders.json`,
      params
    } );

  }

  getOrder( orderId ) {

    return this.request( {
      method: 'GET',
      endpoint: `orders/${ orderId }.json`,
    } );

  }

  listCustomers( customerIds ) {

    const params = {};

    if( Array.isArray( customerIds ) ) {

      params.ids = customerIds.join(',');

    }

    return this.request( {
      method: 'GET',
      endpoint: `customers.json`,
      params
    } );

  }

}

module.exports = Client;