const mongoose = require('mongoose');
const Promise = require('bluebird');

const {
  IllegalActionError,
  ResourceNotFoundError,
  ChildResourceNotFoundError
} = require('../errors');

/************************************************
 * Helpers
 * =======
 * 
 *********/


const orderQueryFilter = ( { handle, isShipped } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }

  if( isShipped !== undefined ) {
    filter.isShipped = isShipped;
  }

  return filter;
}

/************************************************
 * 
 * Public Database Client
 * ======================
 * 
 ****/


class FulfillmentCommander {
  constructor({ mongooseConnection, inventoryCommander }) {
    this.conn = mongooseConnection;

    const order = require('./models/order');

    // initialize models
    this.Order = mongooseConnection.model( 'Order', order.schema.base );

    this.ShopifyOrder = this.Order.discriminator( 'shopify', order.schema.shopify );

  }


  listOrders( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = orderQueryFilter( filterParams );

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'createdAt';
    }

    const sortParams = {
      [ sortField ] : sortDir || 1
    };

    let q = this.Order.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    for( let path of populate ) {

      q = q.populate( path );

    }

    return q.exec();
  }

  countOrders( filterParams ) {

    const filter = orderQueryFilter( filterParams );

    return this.Order.countDocuments( filter );

  }

  getOrderById( orderId, { populate, includeDeleted = false } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( orderId );
    }
    catch {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.Order.findOne( findDoc );

    if( populate ) {

      for( let path of populate ) {

        q = q.populate( path );

      }

    }

    return q.exec();

  }

  async deleteOrder( orderId ) {

    const order = await this.getOrderById( orderId );

    if( !order ) {
      throw new ResourceNotFoundError( { type: 'order', id: orderId } );
    }

    if( order.isDeleted ) {
      return {};
    }

    await order.delete();

    return { order };
  }

}

module.exports = FulfillmentCommander;