const mongoose = require('mongoose');

const {
  ResourceNotFoundError,
  ChildResourceNotFoundError,
  IllegalActionError
} = require('../errors');
const helpers = require('../helpers');


/************************************************
 * Constants
 * =========
 *
 *********/

const __CLAIM_ORDER_ITEM_CLAIM_EDITABLE_FIELDS__ = [
  'units'
];

/************************************************
 * Helpers
 * =======
 *
 *********/

const claimQueryFilter = ( { orderNumber, ticketId, toBeReviewed, includeClosed = false, } ) => {
  const filter = {
    isDeleted: false,
  };

  if( !includeClosed ) {
    filter.isClosed = false;
  }

  if( toBeReviewed !== undefined ) {
    filter.toBeReviewed = toBeReviewed;
  }

  if( orderNumber ) {
    filter.orderNumber = orderNumber;
  }

  if( ticketId ) {
    filter[ "tickets.ticketId" ] = ticketId;
  }

  return filter;
};

const shopifyLineItems2ClaimOrderItems = ( shopifyLineItems, order_discount_applications ) => {

  const orderItems = [];
  for( let li of shopifyLineItems ) {

    const orderItem = {
      name: li.name,
      sku: li.sku,
      // TODO: don't use floats!?!
      price: parseFloat( li.price ),
      discounts: [],
    };

    for( let _discount_allocation of li.discount_allocations ) {

      const orderLevelDiscount = order_discount_applications[ _discount_allocation.discount_application_index ];

      orderItem.discounts.push( {
        amount: parseFloat( _discount_allocation.amount ),
        name: orderLevelDiscount ? orderLevelDiscount.name : ''
      } );

    }

    if( li.lot ) {
      orderItem.lot = li.lot._id;
    }

    if( li.product ) {
      orderItem.productId = li.product.id;
      orderItem.productTitle = li.product.title;

      const manifestUrlMetafield = li.product.metafields.find( m => m.namespace === 'manifest' && m.key === 'file' );
      if( manifestUrlMetafield ) {
        orderItem.manifestUrl = manifestUrlMetafield.value;
      }

      const unitsMetafield = li.product.metafields.find( m => m.namespace === 'lot' && m.key === 'totalUnits' );
      if( unitsMetafield ) {
        orderItem.units = unitsMetafield.value;
      }
    }

    if( li.variant ) {
      orderItem.variantId = li.variant.id;
      orderItem.variantTitle = li.variant.title;
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

    const discounts = shopifyOrder.discount_applications.map( _ => ({
      name: _.code || _.title || _.description,
      amount: parseFloat(_.value)
    }) );

    const data = Object.assign(
      {
        orderId: shopifyOrder.id,
        orderNumber: shopifyOrder.order_number,
        orderDate: new Date( shopifyOrder.created_at ),

        orderItems: shopifyLineItems2ClaimOrderItems( shopifyOrder.line_items, discounts ),

        discounts,

        // metadata
        agent: agentId,
        toBeReviewed: false,
        isClosed: false,
        isDeleted: false,
      },
    );

    const newClaim = new this.Claim( data );
    return newClaim.save();
  }

  async editOrderItemClaim( claimId, orderItemId, _editDoc ) {

    const claim = await this.getClaimById( claimId );

    if( !claim ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    const orderItem = claim.getOrderItem( orderItemId );

    if( !orderItem ) {
      throw new ChildResourceNotFoundError( {
        parentType: 'claim',
        parentId: claimId,
        childType: 'order item',
        childId: orderItemId
      } );
    }

    if( !orderItem.hasClaim() ) {
      throw new IllegalActionError( `No claim yet started for '${orderItem._id}'.`, 'NO_ORDER_ITEM_CLAIM' );
    }

    const edits =
      Object.keys( _editDoc )
        .filter( _key => __CLAIM_ORDER_ITEM_CLAIM_EDITABLE_FIELDS__.includes(_key) )
        .map( _key => ({ path: _key, oldValue: orderItem.claim[ _key ], newValue: _editDoc[ _key ] }) ).filter( x => x.oldValue !== x.newValue );


    if( edits.length >= 0 ) {

      const editDoc = edits.reduce( (acc, _) => {
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      orderItem.editClaim( editDoc );
      await claim.save();
    }

    return { claim, orderItem, edits };
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

  async setClaimToBeReviewed( claimId, toBeReviewed ) {

    const claim = await this.getClaimById( claimId );

    if( !claim ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    if( claim.toBeReviewed !== toBeReviewed ) {
      await claim.setToBeReviewed( toBeReviewed );
    }

    return { claim };

  }

  async addClaimNote( claimId, content, user ) {

    const claim = await this.getClaimById( claimId );

    if( !claim ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    if( content ) {
      await claim.addNote( content, user );
    }

    return { claim };

  }

  async setClaimTickets( claimId, ticketIds ) {

    const claim = await this.getClaimById( claimId );

    if( !claim ) {
      throw new ResourceNotFoundError( { type: 'claim', id: claimId } );
    }

    if( Array.isArray( ticketIds ) ) {
      await claim.setTickets( ticketIds );
    }

    return { claim };

  }

}

module.exports = ClaimsCommander;