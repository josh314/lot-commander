const axios = require('axios');

const {
  IllegalActionError
} = require('../errors');

/*****************************************
 * Helpers
 * =======
 *
 ********/

// for pretty-printing in debug mode
const _prettyPrintGqlQuery = q => {
  console.log('-----------------------------------------');
  console.log('Shopify GraphQL query:');

  let lines = q.split('\n');
  lines = lines.slice(1);

  const match = lines[0].match(/( *)/);
  const numLeadSpaces = match[1].length;
  lines = lines.map( s => s.slice(numLeadSpaces) );
  console.log(lines.join('\n'));
  console.log('-----------------------------------------');
};

function flattenEdges( connection ) {
  if ( connection && connection.edges ) {
    return connection.edges.map( edge => edge.node );
  }
  return [];
}

const _arrayifyGqlMultiData = gqlMultiData => Object.entries(gqlMultiData).map( x => x[1] ).filter( _ => _ );


function metafieldsReturnFormat( metafields ) {

  let metafieldsReturnFormat = '';
  if( metafields && metafields.length ) {
    metafieldsReturnFormat = `
      metafields ( first: ${ metafields.length } ) {
        edges {
          node {
            id
            namespace
            key
            value
          }
        }
      }
    `;
  }

  return metafieldsReturnFormat;

}

// Trimming the query of unnecessary whitespace
// const compressGqlQuery = q => q.split('\n').map( s => s.trim() ).join(' ');

class Client {
  constructor({ storeId, storeName, locationId, accessToken }) {

    Object.assign(
      this,
      {
        storeId,
        storeName,
        locationId,
        accessToken
      }
    );

  }

  id2Gid( id, type ) {
    return `${id}`.search(`gid://shopify/${ type }/`) < 0 ? `gid://shopify/${ type }/${id}` : id;
  }

  gid2Id( gid, type ) {

    if( typeof gid === 'number' ) {
      return gid;
    }
    else {
      const p = new RegExp( `gid://shopify/${ type }/([0-9]*)` );
      const m = gid.match(p);
      if( m && m[1] ) {
        return parseInt(m[1]);
      }
    }

    return null;
  }

  gqlRequest( { gqlQuery, variables, debug = false } ) {
    if (debug) {
      console.log(JSON.stringify(gqlQuery, null, 2)); // Pretty print the query
    }

    const req = {

      method: 'POST',

      url: `https://${this.storeName}.myshopify.com/admin/api/2025-07/graphql.json`,

      headers: {
        "Content-Type": "application/json", // Use application/json instead of application/graphql
        "X-Shopify-Access-Token": this.accessToken
      },

      // check if `gqlQuery` is an object with `query` field, if not, wrap it in an object
      data: {
        query: gqlQuery,
        variables,
      },

      responseType: 'json'

    };

    return axios( req )
      .then( resp => resp.data )
      .catch(e => {
        if ( e.response && e.response.data && e.response.data.errors ) {
          console.error( JSON.stringify( e.response.data.errors, null, 2) ); // Log detailed error
          throw e.response.data.errors;
        } else {
          console.error(e.message); // Log basic error if no detailed response
          throw e.message;
        }
      });
  }


  // Basic getters and listers

  getPage(queryType, nodeQuery, { pageSize, args, searchQuery, cursor, debug } = {}) {

    const queryArgs = Object.assign({ first: pageSize || 1 }, args ? args : {} );

    if(searchQuery) {
      queryArgs.query = searchQuery;
    }

    if(cursor) {
      queryArgs.after = cursor;
    }

    const queryReturnFormat = `
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node ${nodeQuery}
      }`
    ;

    let gqlQuery;
    if( queryType === 'shopMetafields' ) {
      gqlQuery =`
      {
        shop {
          page: metafields(${ Object.entries(queryArgs).map( ([key, val]) => `${key}: ${ typeof val === 'string' ? `"${val}"` : val }` ).join(', ') }) {${queryReturnFormat}
          }
        }
      }
    `;
    }
    else {
      gqlQuery = `
      {
        page: ${queryType}(${ Object.entries(queryArgs).map( ([key, val]) => `${key}: ${ typeof val === 'string' ? `"${val}"` : val }` ).join(', ') }) {${queryReturnFormat}
        }
      }
    `;
    }

    return this.gqlRequest({
      debug: debug,
      gqlQuery: gqlQuery,
    });

  }

  async getAll(queryType, nodeQuery, { args, searchQuery, debug, cursor } = {}, processNode = null) {

    let items = [];
    let getNextPage = true;

    let queryCost = 0;
    let availableCost = 1000;

    try {
      while( getNextPage && queryCost < availableCost ) {
        const resp = await this.getPage(
          queryType,
          nodeQuery,
          {
            pageSize: 10,
            args,
            searchQuery: searchQuery,
            debug: debug,
            cursor: cursor
          }
        );

        let page;
        if(resp.errors) {
          throw new Error(JSON.stringify(resp,null,2));
        }
        else {
          if(debug) {
            try {
              console.log(JSON.stringify(resp,null,2));
            }
            catch(e) {
              console.log(resp);
            }
          }

          page = queryType === 'shopMetafields' ? resp.data.shop.page : resp.data.page;
          queryCost = resp.extensions.cost.requestedQueryCost;
          availableCost = resp.extensions.cost.throttleStatus.currentlyAvailable;

          if(page.edges.length) {
            items = items.concat(page.edges);
            getNextPage = page.pageInfo.hasNextPage;
            cursor = page.edges[page.edges.length-1].cursor;
          }
          else {
            getNextPage = false;
          }
        }
      }

      const result = {
        hasNextPage: getNextPage,
        cursor: cursor,
        searchQuery: searchQuery,
        queryCost: queryCost,
        availableCost: availableCost,
      };

      result[queryType] = items.map( elem => {
        return processNode ? processNode(elem.node) : elem;
      });

      return result;
    }
    catch(e) {
      throw e;
    }
  }

  async getMetafield( gid ) {

    try {
      const resp = await this.gqlRequest( {
        gqlQuery: `
          {
            metafield( id: "${ gid }" ) {
              id
              namespace
              key
              value
              type
              ownerType
              reference
              createdAt
              updatedAt
            }
          }
        `,
        debug: false
      });

      return resp.data;
    }
    catch(e) {
      throw e;
    }

  }

  async getShopMetafieldsByNamespace( namespace ) {
    const resp = await this.gqlRequest( {
      gqlQuery: `
        {
          shop {
            metafields( namespace:"${namespace}", first: 10 ) {
              pageInfo {
                hasNextPage
              }
              edges {
                cursor
                node {
                  id
                  namespace
                  key
                  value
                }
              }
            }
          }
        }
      `,
      debug: false
    });

    try {
      return resp.data;
    }
    catch(e) {
      throw e;
    }
  }

  async getShopMetafield( namespace, key ) {
    const resp = await this.gqlRequest( {
      gqlQuery: `
        {
          shop {
            metafield( namespace:"${namespace}", key:"${key}") {
              value
            }
          }
        }
      `,
      debug: false
    });

    try {
      return JSON.parse( resp.data.shop.metafield.value );
    }
    catch(e) {
      throw e;
    }
  }

  async listActiveProducts( { debug, cursor, everydayBargainsOnly } = {} ) {

    const productNodeQuery = `
      {
        id
        title
        tags
      }
    `;

    const processFn = n => ({
      gid: n.id,
      title: n.title,
      tags: n.tags
    });

    let searchQuery;
    if( everydayBargainsOnly ) {
      searchQuery = "status:'active' AND ( tag:'everyday bargains')";
    }
    else {
      searchQuery = "status:'active'";
    }

    const result = await this.getAll( 'products', productNodeQuery, { searchQuery: searchQuery, debug: debug, cursor: cursor }, processFn );

    return result.products;

  }

  async listActiveProductVariants( { debug, cursor, everydayBargainsOnly } = {} ) {

    const productVariantNodeQuery = `
      {
        id
        title
        product {
          id
          title
          tags
        }
      }
    `;

    const processFn = n => ({
      gid: n.id,
      title: n.title,
      tags: n.product ? n.product.tags : [],
      productGid: n.product && n.product.id,
      productTitle: n.product && n.product.title,
    });

    let searchQuery;
    if( everydayBargainsOnly ) {
      searchQuery = "product_status:'active' AND ( tag:'everyday bargains')";
    }
    else {
      searchQuery = "product_status:'active'";
    }

    const result = await this.getAll( 'productVariants', productVariantNodeQuery, { searchQuery: searchQuery, debug: debug, cursor: cursor }, processFn );

    return result.productVariants;

  }

  async getProductVariant( pvid ) {

    const gqlPvid = this.id2Gid( pvid, 'ProductVariant' );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        {
          productVariant(id: "${ gqlPvid }") {
            id
            title
            product {
              id
              title
              tags
            }
          }
        }
      `,
      debug: false
    });


    try {

      const pv = resp.data.productVariant;
      if( pv ) {

        return {
          gid: pv.id,
          title: pv.title,
          tags: pv.product ? pv.product.tags : [],
          productGid: pv.product && pv.product.id,
          productTitle: pv.product && pv.product.title,
        };

      }
      else {
        return null;
      }

    }
    catch(e) {
      throw e;
    }

  }

  async getShippingRatesTable() {
    return this.getShopMetafield( "wsn_shipping", "rate_table" );
  }

  async setShippingRatesTable( rateTable ) {

    const tableString = JSON.stringify( rateTable );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        mutation
        {
          metafieldsSet(metafields: {
            key: "rate_table",
            namespace: "wsn_shipping",
            ownerId: "${ this.storeId }",
            type: "single_line_text_field",
            value: "${ tableString }"
          }) {
            userErrors {
              field
              message
            }
            metafields {
              id
            }
          }
        }
      `,
      debug: false
    });

    try {
      return resp;
    }
    catch(e) {
      throw e;
    }
  }

  async getProductVariantShippingRate( pvid ) {

    const gqlPvid = this.id2Gid( pvid, 'ProductVariant' );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        {
          productVariant(id: "${ gqlPvid }") {
            id
            displayName
            rate: metafield(namespace:"wsn_shipping", key:"flat_rate") {
              value
            }
          }
        }
      `,
      debug: false
    });

    try {
      return parseFloat( resp.data.productVariant.rate.value );
    }
    catch(e) {
      throw e;
    }
  }

  async setProductVariantShippingRate( pvid, rate ) {

    const gqlPvid = this.id2Gid( pvid, 'ProductVariant' );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        mutation
        {
          metafieldsSet(metafields: {
            key: "flat_rate",
            namespace: "wsn_shipping",
            ownerId: "${ gqlPvid }",
            type: "number_decimal",
            value: "${ rate }"
          }) {
            userErrors {
              field
              message
            }
            metafields {
              id
              value
            }
          }
        }
      `,
      debug: false
    });

    try {
      return {
        id: pvid,
        rate: parseFloat( resp.data.metafieldsSet.metafields[0].value )
      };
    }
    catch(e) {
      throw e;
    }
  }

  async listProductVariantShippingRates( { debug, cursor, includePallets } = {} ) {

    const productVariantFlatRateNodeQuery = `
      {
        id
        displayName
        title
        product {
          title
        }
        rate: metafield( namespace: "wsn_shipping", key: "flat_rate" ) {
          value
        }
      }
    `;

    const processFn = n => ({
      gid: n.id,
      name: n.title === 'Default Title' ? n.product.title : n.displayName,
      variantTitle: n.title,
      productTitle: n.product.title,
      rate: n.rate && parseFloat( n.rate.value )
    });

    let searchQuery;
    if( includePallets ) {
      searchQuery = "product_status:'active' AND ( tag:'collection:pallets')";
    }
    else {
      searchQuery = "product_status:'active' AND ( NOT tag:'collection:pallets')";
    }

    const result = await this.getAll( 'productVariants', productVariantFlatRateNodeQuery, { searchQuery: searchQuery, debug: debug, cursor: cursor }, processFn );

    return result.productVariants;
  }

  async getProductVariantBundle( pvid ) {

    const gqlPvid = this.id2Gid( pvid, 'ProductVariant' );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        {
          productVariant(id: "${ gqlPvid }") {
            id
            displayName
            bundle: metafield(namespace:"bundle", key:"contents") {
              value
            }
          }
        }
      `,
      debug: false
    });

    try {
      return resp.data.productVariant.bundle && JSON.parse( resp.data.productVariant.bundle.value );
    }
    catch(e) {
      throw e;
    }

  }

  async setProductVariantBundle( pvid, bundle, { debug = false } = {} ) {

    const gqlPvid = this.id2Gid( pvid, 'ProductVariant' );

    // Why JSON.stringify twice?
    // The first time creates a normal string. The second time escapes the string which is needed to properly insert into the GraphQL query string. C'est la vie
    const value = JSON.stringify( JSON.stringify( bundle ) );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        mutation
        {
          metafieldsSet(metafields: {
            key: "contents",
            namespace: "bundle",
            ownerId: "${ gqlPvid }",
            type: "json"
            value: ${ value }
          }) {
            userErrors {
              field
              message
            }
            metafields {
              id
              value
            }
          }
        }
      `,
      debug,
    });

    try {
      return {
        id: pvid,
        value: resp.data.metafieldsSet.metafields[0].value
      };
    }
    catch(e) {

      try {
        console.error( JSON.stringify(resp,null,2) );
      }
      catch(_) {
        console.error( resp );
      }

      throw e;
    }
  }

  async listProductVariantBundles( { debug, cursor } = {} ) {

    const productBundleNodeQuery = `
      {
        id
        displayName
        title
        product {
          title
        }
        bundle: metafield( namespace: "bundle", key: "contents" ) {
          value
        }
      }
    `;

    const processFn = n => ({
      gid: n.id,
      name: n.title === 'Default Title' ? n.product.title : n.displayName,
      variantTitle: n.title,
      productTitle: n.product.title,
      bundle: n.bundle && JSON.parse( n.bundle.value )
    });

    const searchQuery = "product_status:'active' AND ( tag:'bundle')";

    const result = await this.getAll( 'productVariants', productBundleNodeQuery, { searchQuery: searchQuery, debug: debug, cursor: cursor }, processFn );

    return result.productVariants;
  }

  async getShopMetafields( namespace ) {
    const metafieldNodeQuery = `{
      id
      namespace
      key
      value
      type
    }`;

    const processFn = n => Object.assign( {}, n, { value: n.type === 'json' ? JSON.parse(n.value) : n.value });

    const result = await this.getAll('shopMetafields', metafieldNodeQuery, { args: namespace ? { namespace } : {} }, processFn );

    return result ? { metafields: result.shopMetafields } : result;

  }

  async setShopMetafield( { namespace, key, value, type } ) {

    try {

      if( value === null || typeof value === 'undefined' || value === '' ) {
        throw new IllegalActionError(`Invalid metafield value.`, 'BLANK_METAFIELD_VALUE');
      }

      // must stringify (AND quote!) numbers, and escape newlines/whitespace in strings
      const valueStr = (typeof value  === 'number') ? `"${value}"` : JSON.stringify(value);

      const requestString = `
        mutation
        {
          metafieldsSet(metafields: {
            namespace: "${ namespace }",
            key: "${ key }",
            ownerId: "${ this.storeId }",
            type: "${ type }",
            value: ${ valueStr }
          }) {
            userErrors {
              field
              message
            }
            metafields {
              id
              namespace
              key
              value
              type
            }
          }
        }
      `;

      const resp = await this.gqlRequest( {
        gqlQuery: requestString,
        debug: false
      });

      if( resp.data.metafieldsSet.userErrors.length ) {
        throw new Error( JSON.stringify(resp.data.metafieldsSet.userErrors, null, 2) );
      }

      return resp.data.metafieldsSet;
    }
    catch(e) {
      throw e;
    }
  }

  async removeMetafield( ownerId, namespace, key ) {

    try {

      const gqlQuery = `
        mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
          metafieldsDelete(metafields: $metafields) {
            deletedMetafields {
              key
              namespace
              ownerId
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      if( !ownerId ) {
        ownerId = this.storeId;
      }

      const variables = {
        metafields: [
          {
            ownerId,
            namespace,
            key
          }
        ]
      };

      const resp = await this.gqlRequest( {
        gqlQuery,
        variables,
        debug: false
      });

      if( resp.data.metafieldsDelete.userErrors.length ) {
        throw new Error( JSON.stringify(resp.data.metafieldsDelete.userErrors, null, 2) );
      }

      return { deletedMetafields: resp.data.metafieldsDelete.deletedMetafields };

    }
    catch(e) {
      throw e;
    }

  }

  async removeProductVariantShippingRate( pvGid ) {

    return this.removeMetafield( pvGid, 'wsn_shipping', 'flat_rate' );

  }

  getPalletBreakdownServiceRate() {
    return this.getShopMetafield( 'wsn_shipping', 'palletBreakdownServiceRate' );
  }

  async setPalletBreakdownServiceRate( newRate ) {

    const resp = await this.setShopMetafield({
      namespace: 'wsn_shipping',
      key: 'palletBreakdownServiceRate',
      value: newRate,
      type: 'number_decimal'
    });

    return { rate: parseFloat( resp.metafields[0].value ) };
  }

  async getProductVariantShippingConfiguration( pvid ) {

    const gqlPvid = this.id2Gid( pvid, 'ProductVariant' );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        {
          productVariant(id: "${ gqlPvid }") {
            id
            displayName
            shippingConfiguration: metafield( namespace: "shipping", key: "shippingItems" ) {
              value
            }
          }
        }
      `,
      debug: false
    });

    try {
      return resp.data.productVariant.shippingConfiguration && JSON.parse( resp.data.productVariant.shippingConfiguration.value );
    }
    catch(e) {
      throw e;
    }
  }

  async setProductVariantShippingConfiguration( pvid, shippingConfiguration ) {

    const gqlPvid = this.id2Gid( pvid, 'ProductVariant' );

    // Why JSON.stringify twice?
    // The first time creates a normal string. The second time escapes the string which is needed to properly insert into the GraphQL query string. C'est la vie
    const value = JSON.stringify( JSON.stringify( shippingConfiguration ) );

    const resp = await this.gqlRequest( {
      gqlQuery: `
        mutation
        {
          metafieldsSet(metafields: {
            key: "shippingItems",
            namespace: "shipping",
            ownerId: "${ gqlPvid }",
            type: "json",
            value: ${ value }
          }) {
            userErrors {
              field
              message
            }
            metafields {
              id
              value
            }
          }
        }
      `,
      debug: false
    });

    try {
      return {
        id: pvid,
        shippingConfiguration: JSON.parse( resp.data.metafieldsSet.metafields[0].value )
      };
    }
    catch(e) {
      throw e;
    }
  }

  async listProductVariantShippingConfigurations( { debug, cursor, includePallets, everydayBargainsOnly } = {} ) {

    const productVariantShippingConfigurationNodeQuery = `
      {
        id
        displayName
        title
        product {
          id
          title
          tags
        }
        shippingConfiguration: metafield( namespace: "shipping", key: "shippingItems" ) {
          value
        }
      }
    `;

    const processFn = n => ({
      gid: n.id,
      name: n.title === 'Default Title' ? n.product.title : n.displayName,
      variantTitle: n.title,
      productTitle: n.product.title,
      productId: n.product.id,
      shippingConfiguration: n.shippingConfiguration && JSON.parse( n.shippingConfiguration.value ),
      tags: n.product.tags
    });

    let searchQuery = `product_status:'active'`;

    if( !includePallets ) {
      searchQuery += " AND ( NOT tag:'collection:pallets')";
    }

    if( everydayBargainsOnly ) {
      searchQuery += " AND ( tag:'everyday bargains')";
    }

    const result = await this.getAll( 'productVariants', productVariantShippingConfigurationNodeQuery, { searchQuery: searchQuery, debug: debug, cursor: cursor }, processFn );

    return result.productVariants;
  }

  async removeProductVariantShippingConfiguration( pvid ) {

    const pvGid = this.id2Gid( pvid, 'ProductVariant' );

    return this.removeMetafield( pvGid, 'shipping', 'shippingItems' );

  }

  /******************************************************
   * Product & variant management
   * ============================
   *
   *
   ***************/


  async createProduct( product, media, { debug } = {} ) {

    const gqlQuery = `
      mutation productCreate( $product: ProductInput!, $media: [CreateMediaInput!] ) {
        productCreate( input: $product, media: $media ) {
          product {
            id
            handle
            status
            title
            mediaCount {
              count
              precision
            }
            options {
              id
              name
              optionValues {
                name
              }
            }
            ${ metafieldsReturnFormat( product.metafields ) }
            variants ( first: 1 ) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
          userErrors {
            message
            field
          }
        }
      }
    `;

    const variables = {
      product,
      media
    };

    const resp = await this.gqlRequest( {
      gqlQuery,
      variables,
      debug
    });

    try {
      const product = resp.data.productCreate.product;
      if( product.variants ) {
        product.variants = flattenEdges( product.variants ); // Replace the variants connection with a flat array
      }
      if( product.metafields ) {
        product.metafields = flattenEdges( product.metafields ); // Replace the variants connection with a flat array
      }

      return { product };
    }
    catch(e) {
      console.error( JSON.stringify(resp,null,2) );
      throw e;
    }

  }

  deleteProduct( productId, { debug } = {} ) {

    return this.gqlRequest( {
      gqlQuery: `
        mutation {
          productDelete(
            input: { id: "${ this.id2Gid( productId, 'Product' ) }" }
          ) {
            deletedProductId
            userErrors {
              field
              message
            }
          }
        }
      `,
      debug
    });

  }

  async createProductVariants( productId, variants, { debug, replace } = {} ) {

    const gqlQuery = `
      mutation productVariantsBulkCreate( $productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy ) {
        productVariantsBulkCreate( productId: $productId, variants: $variants, strategy: $strategy ) {
          product {
            id
          }
          productVariants {
            id
            inventoryItem {
              id
              measurement {
                id
                weight {
                  unit
                  value
                }
              }
              sku
              tracked
            }
            inventoryQuantity
          }
          userErrors {
            message
            field
          }
        }
      }
    `;

    const variables = {
      productId,
      variants,
      strategy: replace ? 'REMOVE_STANDALONE_VARIANT' : 'DEFAULT'
    };

    const resp = await this.gqlRequest( {
      gqlQuery,
      variables,
      debug
    });

    try {

      const { productVariants } = resp.data.productVariantsBulkCreate;
      return { productVariants };
    }
    catch(e) {
      console.log( JSON.stringify(resp,null,2) );
      throw e;
    }

  }


}

module.exports = Client;
