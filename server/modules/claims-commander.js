const mongoose = require('mongoose');

const {
  ResourceNotFoundError,
  ChildResourceNotFoundError,
  IllegalActionError
} = require('../errors');
const helpers = require('../helpers');


/************************************************
 * Helpers
 * =======
 *
 *********/

const claimQueryFilter = ( { includeClosed = false, orderNumber } ) => {
  const filter = {
    isDeleted: false,
  };

  if( !includeClosed ) {
    filter.isClosed = false;
  }

  if( orderNumber ) {
    filter.orderNumber = orderNumber;
  }

  return filter;
};

const shopifyLineItems2ClaimOrderItems = shopifyLineItems => {

  const orderItems = [];
  for( let li of shopifyLineItems ) {

    const orderItem = {
      name: li.name,
      sku: li.sku,
      productId: li.product.id,
      productTitle: li.product.title,
      variantId: li.variant.id,
      variantTitle: li.variant.title,
      // tags: li.product.tags,
      // metafields: li.product.metafields.concat( li.variant.metafields ),

      // TODO: don't use floats!?!
      price: parseFloat( li.price ),
      pricePaid: parseFloat( li.price ) - parseFloat( li.total_discount )
    };

    if( li.lot ) {
      orderItem.lot = li.lot._id;
    }

    const manifestUrlMetafield = li.product.metafields.find( m => m.namespace === 'manifest' && m.key === 'file' );
    if( manifestUrlMetafield ) {
      orderItem.manifestUrl = manifestUrlMetafield.value;
    }

    const unitsMetafield = li.product.metafields.find( m => m.namespace === 'lot' && m.key === 'totalUnits' );
    if( unitsMetafield ) {
      orderItem.units = unitsMetafield.value;
    }

    // "flatten" shopifyOrder.line_items so only 1 quantity per item
    for( let i=0; i<li.quantity; i++ ) {
      orderItems.push( Object.assign( {}, orderItem ) );
    }
  }

  return orderItems;
};

class ClaimsCommander {

  constructor( { Claim, Lot } ) {

    this.Claim = Claim;
    this.Lot = Lot;

  }

  getClaimById( claimId, { populate, includeDeleted = false } = {} ) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( claimId );
    }
    catch ( _ ) {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.Claim.findOne( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  listClaims( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = claimQueryFilter( filterParams );

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

    let q = this.Claim.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  countClaims( filterParams ) {

    const filter = claimQueryFilter( filterParams );

    return this.Claim.countDocuments( filter );

  }

  async deleteClaim( claimId ) {

    const claim = await this.getClaimById( claimId );

    if( !claim || claim.isDeleted ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    await claim.delete();

    return { claim };
  }

  findClaimByOrderId( orderId, { populate, includeDeleted = false } = {} ) {

    const findDoc = { orderId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.Claim.findOne( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  findClaimByOrderNumber( orderNumber, { populate, includeDeleted = false } = {} ) {

    const findDoc = { orderNumber };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.Claim.findOne( findDoc );


    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  async dressLineItemWithLot( lineItem ) {

    if( lineItem.sku ) {

      const lot = await this.Lot.findOne( { handle: lineItem.sku } );

      if( lot ) {
        lineItem.lot = lot;
      }

    }

    return lineItem;
  }

  async createClaim( { shopifyOrder, agentId } ) {

    await Promise.all( shopifyOrder.line_items.map( li => this.dressLineItemWithLot( li ) ) );

    const data = Object.assign(
      {
        orderId: shopifyOrder.id,
        orderNumber: shopifyOrder.order_number,
        orderDate: new Date( shopifyOrder.created_at ),

        orderItems: shopifyLineItems2ClaimOrderItems( shopifyOrder.line_items ),

        // metadata
        agent: agentId,
        isClosed: false,
        isDeleted: false,
      },
    );

    const newClaim = new this.Claim( data );
    return newClaim.save();
  }


  async updateOrderItemClaimUnits( claimId, orderItemId, units ) {

    const claim = await this.getClaimById( claimId );

    if( !claim ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    const orderItem = await claim.updateOrderItemClaimUnits( orderItemId, units );

    if( !orderItem ) {
      throw new ChildResourceNotFoundError( {
        parentType: 'claim',
        parentId: claimId,
        childType: 'order item',
        childId: orderItemId
      } );
    }

    return orderItem;
  }

  async closeClaim( claimId ) {

    const claim = await this.getClaimById( claimId );

    if( !claim ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    if( !claim.isClosed ) {
      await claim.close();
    }

    return { claim };

  }

  async reopenClaim( claimId ) {

    const claim = await this.getClaimById( claimId );

    if( !claim ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    if( claim.isClosed ) {
      await claim.reopen();
    }

    return { claim };
  }

}

module.exports = ClaimsCommander;