const mongoose = require('mongoose');

const shopifyOrdersQueryFilter = ( { toBeFulfilled } ) => {
  const filter = {};

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

    filter.cancelledAt = null;

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
  } ) {

    this.ShopifyOrder = ShopifyOrder;

  }



  async listShopifyOrders( { num, skip, sort, sortDir, filterParams } ) {

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

    return q.exec();

  }

  countShopifyOrders( filterParams ) {

    const filter = shopifyOrdersQueryFilter(filterParams);

    return this.ShopifyOrder.countDocuments( filter );

  }

  // get by mongodb _id field
  getShopifyOrderById( id ) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( id );
    }
    catch ( _ ) {
      return null;
    }

    return this.ShopifyOrder.findOne( { _id: objectId } );

  }

  // get by shopify's graphql id
  getShopifyOrderByShopifyId( shopifyId ) {

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

    return this.ShopifyOrder.findOne( { id: _shopifyId } );

  }

  // get by shopify's order number
  getShopifyOrderByShopifyOrderNumber( shopifyOrderNumber ) {

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

    return this.ShopifyOrder.findOne( { name: orderName } );

  }

}

module.exports = ShopifyOrders;