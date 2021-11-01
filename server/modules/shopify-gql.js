const axios = require('axios');

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

const productVariantId2Gid = pvid => `${pvid}`.search('gid://shopify/ProductVariant/') < 0 ? `gid://shopify/ProductVariant/${pvid}` : pvid;

const _productVariantGid2Id = pvid => {

  if( typeof pvid === 'number' ) {
    return pvid;
  }
  else {
    const p = /gid:\/\/shopify\/ProductVariant\/([0-9]*)/;
    const m = pvid.match(p);
    if( m && m[1] ) {
      return parseInt(m[1]);
    }
  }

  return null;
};

const _arrayifyGqlMultiData = gqlMultiData => Object.entries(gqlMultiData).map( x => x[1] ).filter( _ => _ );

// Trimming the query of unnecessary whitespace
const compressGqlQuery = q => q.split('\n').map( s => s.trim() ).join(' ');

class Client {
  constructor({ storeId, storeName, accessToken }) {
    this.storeId = storeId,
    this.storeName = storeName;
    this.accessToken = accessToken;
  }

  gqlRequest({ gqlQuery, debug = false }) {
    if(debug) {
      // prettyPrintGqlQuery(gqlQuery);
      console.log(gqlQuery);
    }

    const req = {
      method: 'POST',
      url: `https://${this.storeName}.myshopify.com/admin/api/2021-10/graphql.json`,
      headers: {
        "Content-Type": "application/graphql",
        "X-Shopify-Access-Token": this.accessToken
      },
      data: compressGqlQuery(gqlQuery),
      responseType: 'json'
    };

    return axios(req)
      .then( resp => resp.data )
      .catch( e => {
        console.error(e);
        throw e;
      });

  }


  getPage(queryType, nodeQuery, { pageSize, searchQuery, cursor, debug } = {}) {
    const queryArgs = {
      first: pageSize || 1,
    };

    if(searchQuery) {
      queryArgs.query = searchQuery;
    }

    if(cursor) {
      queryArgs.after = cursor;
    }

    const gqlQuery = `
      {
        page: ${queryType}(${ Object.entries(queryArgs).map( ([key, val]) => `${key}: ${ typeof val === 'string' ? `"${val}"` : val }` ).join(', ') }) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node ${nodeQuery}
          }
        }
      }
    `;

    return this.gqlRequest({
      debug: debug,
      gqlQuery: gqlQuery,
    });

  }

  async getAll(queryType, nodeQuery, { searchQuery, debug, cursor } = {}, processNode = null) {

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

          page = resp.data.page;                  
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

  async getShippingRatesTable() {
    const resp = await this.gqlRequest( { 
      gqlQuery: `
        {
          shop {
            metafield( namespace:"wsn_shipping", key:"rate_table") {
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

  async setShippingRatesTable( rateTable ) {

    const tableString = JSON.stringify( rateTable );

    const resp = await this.gqlRequest( { 
      gqlQuery: `
        mutation
        {
          metafieldsSet(metafields: {
            key: "rate_table",
            namespace: "wsn_shipping",
            ownerId: "gid://shopify/Shop/${ this.storeId }",
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

    const gqlPvid = productVariantId2Gid( pvid );

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

    const gqlPvid = productVariantId2Gid( pvid );

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
      searchQuery = "product_status:'active'";
    }
    else {
      searchQuery = "product_status:'active' AND ( NOT tag:'pallets') AND ( NOT tag:'pallets:bulky') AND ( NOT tag:'pallets:oversized')";
    }

    const result = await this.getAll( 'productVariants', productVariantFlatRateNodeQuery, { searchQuery: searchQuery, debug: debug, cursor: cursor }, processFn );

    // const result = await this.getAll( 'productVariants', productVariantFlatRateNodeQuery, { searchQuery: "product_status:'active'", debug: debug, cursor: cursor }, processFn );
    return result.productVariants;
  }

}

module.exports = Client;
