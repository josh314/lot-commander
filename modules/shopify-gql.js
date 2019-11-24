'use strict';

const rp = require('request-promise');

const gqlQueries = {
  ordersPage: (opts) => {
    return `
      {
        orders(first: ${opts.numOrders ? opts.numOrders : 1}${ opts.cursor ? `, after: "${opts.cursor}"` : ''}${opts.query ? `, query:"${opts.query}"`: ''}${opts.sort ? `, sortKey:${opts.sort}`: ''}${opts.reverse ? `, reverse:true`: ''}) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              name
              closed
              createdAt
              lineItems(first: 20) {
                edges {
                  node {
                    sku
                    product {
                      title
                      tags
                    }
                  }
                }
              }
              customer {
                email
              }
            }
          }
        }
      }
    `;
  },
  orderPickList: (opts) => {
    // TODO: get the right data for everyday bargains (which don't have variant skus but variant titles)
    return `
      {
        order(id: ${opts.id}) {
          id
          name
          lineItems(first:100) {
            edges {
              node {
                title
                sku
                quantity
                shippingItems: metafield(namespace:"lot", key:"shippingItems" ) {
                  value
                }
                numBoxes: metafield(namespace:"lot", key:"shippingItems" ) {
                  value
                }
                product {
                  title
                  tags
                }
              }
            }
          }
        }
      }
    `;
  }
};

function arrayifyGqlRes(gqlRes) {
  return Object.entries(gqlRes.data).map( x => x[1] );
}

// TODO: The documentation warns against building GraphQL Ids manually. It might be OK for products and variants though.
const productId2Gid = (pid) => `${pid}`.search('gid://shopify/Product/') < 0 ? `gid://shopify/Product/${pid}` : pid;
const productVariantId2Gid = (pvid) => `${pvid}`.search('gid://shopify/ProductVariant/') < 0 ? `gid://shopify/ProductVariant/${pvid}` : pvid;
const orderId2Gid = (orderId) => `${orderId}`.search('gid://shopify/Order/') < 0 ? `gid://shopify/Order/${orderId}` : orderId;

const gid2OrderId = (gid) => {
  const match = gid.match(/gid:\/\/shopify\/Order\/([0-9]+)$/);
  return match && match[1] ? match[1] : gid;
};

function Client(opts) {

  // Public Interface to export
  const exports = {
    gid2OrderId: gid2OrderId,
    gqlQueries: gqlQueries,
    request: gqlRequest
  };

  // Private vars
  const storeUrl = opts.url;
  const accessToken = opts.token;


  async function gqlRequest(opts={}) {
    if(opts.debug) {
      console.log(opts.query);
    }

    const req = {
      method: 'POST',
      url: `https://${storeUrl}/admin/api/graphql.json`,
      headers: {
        "Content-Type": "application/graphql",
        "X-Shopify-Access-Token": accessToken
      },
      body: opts.query
    };
    console.log(req)
    const resp = await rp(req);
    try {
      return JSON.parse(resp);
    }
    catch (e) {
      return resp;
    }
  }
  exports.request = gqlRequest;

  const processOrderEdge = (edge) => {
    const n = edge.node;

    const order = {
      id: gid2OrderId(n.id),
      orderNumber: n.name,
      numberOfLots: n.lineItems.edges.length 
    };

    return order;
  }

  const getOrdersPage = async function(opts={}) {

    let cursor = opts.cursor || null;
    const pageSize = opts.count || 10;

    try {
      const resp = await gqlRequest({
        debug: opts.debug,
        query: gqlQueries.ordersPage({
          numOrders: pageSize,
          cursor: cursor,
          // query: "published_status:'published'",
          query:opts.query,
          sort: 'CREATED_AT',
          reverse: true
        })
      });

      if(resp.errors || !resp.data.orders) {
        throw new Error(JSON.stringify(resp,null,2));
      }
      else {
        if(opts.debug) {
          try {
            console.log(JSON.stringify(resp,null,2));
          }
          catch(e) {
            console.log(resp);
          }
        }
        const orders = resp.data.orders;

        const page = {
          cursor: orders.pageInfo.hasNextPage ? orders.edges[orders.edges.length-1].cursor : null,
          orders: orders.edges.map( processOrderEdge ) 
        }
        return page;
      }
    }
    catch (e) {
      throw e;      
    }
  };
  exports.getOrdersPage = getOrdersPage;


  const getOrderPickList = async function(opts={}) {
    const resp = await gqlRequest({
      debug: opts.debug,
      query: gqlQueries.orderPickList({
        id: orderId2Gid(opts.orderId),
      })
    });
  };
  exports.getOrderPickList = getOrderPickList;

  // Export the public interface
  return exports;
}

module.exports = Client;
