const mongoose = require('mongoose');

const { appendPopulationQueries } = require('../helpers');
const {
  IllegalActionError
} = require('../errors');

const shopifyOrdersQueryFilter = ( { toBeFulfilled, startDate, endDate } = {} ) => {
  const filter = {
    cancelledAt: null
  };

  if( typeof toBeFulfilled === 'boolean' ) {

    if( toBeFulfilled ) {

      filter.displayFulfillmentStatus = {
        $in: [
          'IN_PROGRESS',
          'OPEN',
          'PARTIALLY_FULFILLED',
          'PENDING_FULFILLMENT',
          'UNFULFILLED',
        ]
      };

      filter.closed  = false;
    }
    else {

      filter.displayFulfillmentStatus = 'FULFILLED';
      filter.closed  = true;

    }

  }

  if( startDate || endDate ) {

    filter.$and = [];

    if( startDate ) {

      filter.$and.push( {
        createdAt: { $gte: startDate }
      });

    }


    if( endDate ) {

      filter.$and.push( {
        createdAt: { $lte: endDate }
      });

    }

  }

  return filter;
};


/************************************************
 * Database client class
 * ============
 *
 ****/


class ShopifyOrders {
  constructor( {
    ShopifyOrder,
    ShopifyOrderPick,
    lotdb,
  } ) {

    Object.assign(
      this,
      {
        ShopifyOrder,
        ShopifyOrderPick,
        lotdb,
      }
    );

  }



  async listShopifyOrders( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = shopifyOrdersQueryFilter(filterParams);

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'createdAt';
    }

    const sortParams = {
      [ sortField ] : sortDir || -1
    };

    if( sortField !== 'createdAt' ) {
      sortParams.createdAt = -1;
    }


    let q = this.ShopifyOrder.find( filter ).skip( skip || 0 ).limit( num || 50 ).sort( sortParams );

    if( populate ) {

      q = appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  countShopifyOrders( filterParams ) {

    const filter = shopifyOrdersQueryFilter(filterParams);

    return this.ShopifyOrder.countDocuments( filter );

  }

  // get by mongodb _id field
  getShopifyOrderById( id, { populate = [] } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( id );
    }
    catch ( _ ) {
      throw new IllegalActionError(`Invalid object id: ${ id }`);
    }

    let q = this.ShopifyOrder.findOne( { _id: objectId } );

    if( populate ) {

      q = appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  // get by shopify's graphql id
  getShopifyOrderByShopifyId( shopifyId, { populate = [] } = {}) {

    let _shopifyId;

    if( typeof shopifyId === 'number' ) {

      _shopifyId = `gid://shopify/Order/${ shopifyId }`;

    }
    else if( typeof shopifyId === 'string' && shopifyId.match( /[0-9]+/ ) ) {

      _shopifyId = `gid://shopify/Order/${ shopifyId }`;

    }
    else if( typeof shopifyId === 'string' && shopifyId.match( /gid:\/\/shopify\/Order\/[0-9]+/ ) ) {

      _shopifyId = shopifyId;

    }
    else {
      return null;
    }

    let q = this.ShopifyOrder.findOne( { id: _shopifyId } );

    if( populate ) {

      q = appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  // get by shopify's order number
  getShopifyOrderByShopifyOrderNumber( shopifyOrderNumber, { populate = [] } = {}) {

    let orderName;

    if( typeof shopifyOrderNumber === 'number' ) {

      orderName = `#${ shopifyOrderNumber }`;

    }
    else if( typeof shopifyOrderNumber === 'string' && shopifyOrderNumber.match( /[0-9]+/ ) ) {

      orderName = `#${ shopifyOrderNumber }`;

    }
    else if( typeof shopifyOrderNumber === 'string' && shopifyOrderNumber.match( /#[0-9]+/ ) ) {

      orderName = shopifyOrderNumber;

    }
    else {
      return null;
    }

    let q = this.ShopifyOrder.findOne( { name: orderName } );

    if( populate ) {

      q = appendPopulationQueries( q, populate );

    }

    return q.exec();

  }


  //==========================================================
  // Fulfillment
  // ===========
  //
  //======================


}

module.exports = ShopifyOrders;