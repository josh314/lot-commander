const axios = require('axios');
const moment = require('moment');

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

// Trimming the query of unnecessary whitespace
const compressGqlQuery = q => q.split('\n').map( s => s.trim() ).join(' ');

const gqlNodeQueries = {
  order: `
    {
      name
      createdAt
      lineItems(first:10) {
        edges {
          node {
            quantity
            product {
              tags
            }
            variant {
              numUnits: title
            }
          }
        }
      }
    }
  `
};

const gqlNodeProcessFn = {
  order: n => ({
    name: n.name,
    date: n.createdAt,
    items: n.lineItems.edges.map( li => {
      if(!li.node.variant || !li.node.product) {
        return null;
      }
      return { numUnits: li.node.quantity*li.node.variant.numUnits, tags: li.node.product.tags }; 
    })
  })
};

class Client {
  constructor({ store, accessToken }) {
    this.store = store;
    this.accessToken = accessToken;
  }

  gqlRequest({ gqlQuery, debug = false }) {
    if(debug) {
      // prettyPrintGqlQuery(gqlQuery);
      console.log(gqlQuery);
    }

    const req = {
      method: 'POST',
      url: `https://${this.store}.myshopify.com/admin/api/graphql.json`,
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

  async getAll(queryType, nodeQuery, { searchQuery, debug, cursor } = {}, processNode = {}) {

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

  getOrderHistory({ start, end, cursor, debug }) {
    start = start || moment().subtract(7, 'days').format();
    const dateQuery = `created_at:>'${start}'${ end ? ` AND created_at:<'${end}'` : ''}`;
    return this.getAll( 'orders', gqlNodeQueries.order, { searchQuery: dateQuery, debug: debug, cursor: cursor }, gqlNodeProcessFn.order );
  }

}

module.exports = Client;
