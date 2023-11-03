const mongoose = require('mongoose');

const { appendPopulationQueries } = require('../helpers');
const {
  ResourceNotFoundError,
  ChildResourceNotFoundError,
  IllegalActionError
} = require('../errors');


/************************************************
 *
 * Public Database Client
 * ======================
 *
 ****/


class FulfillmentCommander {
  constructor( {
    // models

    ShopifyOrderPick,

    // other modules
    inventoryCommander,
    lotdb,
    shopifyAdminClient,
    shopifyOrders,

  } ) {

    Object.assign(
      this,
      {
        ShopifyOrderPick,


        inventoryCommander,
        lotdb,
        shopify: shopifyAdminClient,
        shopifyOrders
      }
    );

  }


  getOrderPickById( orderPickId, { populate, includeDeleted = false } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( orderPickId );
    }
    catch ( _ ) {
      throw new IllegalActionError(`Invalid object id: ${ orderPickId }`);
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.ShopifyOrderPick.findOne( findDoc );

    if( populate ) {

      q = appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  async deleteOrderPickById( orderPickId ) {

    const orderPick = await this.getOrderPickById( orderPickId, { populate: [ 'order' ] } );

    if( !orderPick || orderPick.isDeleted ) {
      throw new ResourceNotFoundError( { type: 'shopify order pick', id: orderPickId } );
    }

    if( orderPick.order ) {
      await orderPick.order.removeOrderPick();
    }

    await orderPick.delete();

    return { orderPick };

  }


  async getOrderPickByOrderId( orderId, { populate, includeDeleted = false } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( orderId );
    }
    catch ( _ ) {
      throw new IllegalActionError(`Invalid object id: ${ orderId }`);
    }


    const findDoc = { order: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.ShopifyOrderPick.findOne( findDoc );

    if( populate ) {

      q = appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  getBasePickItem( lineItem ) {

    const basePickItem = {
      lineItemId: lineItem.id,
      lineItemCount: 1,

      name: lineItem.name,
      sku: lineItem.sku,
      productId: lineItem.product && lineItem.product.id,
      productTitle: lineItem.product && lineItem.product.title,
      variantId: lineItem.variant && lineItem.variant.id,
      variantTitle: lineItem.variant && lineItem.variant.title,

      isPicked: false,
    };

    return basePickItem;

  }

  async getBundlePickItems( lineItem ) {

    const bundle = await this.shopify.getProductVariantBundle( lineItem.variant.id );

    const basePickItem = this.getBasePickItem( lineItem );

    const bundlePickItems = [];

    for( let bundleItem of bundle ) {

      const {
        quantity,
        productTitle: bundleProductTitle,
        productId: bundleProductId,
        gid: bundleVariantId,
        variantTitle: bundleVariantTitle,
        units: _units,
      } = bundleItem;


      for( let i=0; i<quantity; i++ ) {

        const baseBundlePickItem = Object.assign(
          {},
          basePickItem,
          {
            bundleProductId,
            bundleProductTitle,
            bundleVariantId,
            bundleVariantTitle,
          }
        );

        const shippingConfiguration = await this.shopify.getProductVariantShippingConfiguration( bundleVariantId );

        if( shippingConfiguration && shippingConfiguration.length ) {

          for( let shippingConfigurationItem of shippingConfiguration ) {
            bundlePickItems.push( Object.assign( { units: shippingConfigurationItem.units }, baseBundlePickItem, { lineItemCount: i+1 } ) );
          }

        }
        else {

          bundlePickItems.push( Object.assign( { }, baseBundlePickItem, { lineItemCount: i+1 } ) );

        }

      }

    }

    return bundlePickItems;

  }

  getLotPickItems( lineItem, lot ) {

    const baseLotPickItem = Object.assign(
      {
        lot: lot._id
      },
      this.getBasePickItem( lineItem ),
    );

    const lotPickItems = [];

    if( lot.shippingItems ) {

      for( let shippingItem of lot.shippingItems ) {

        const pickItem = Object.assign( {}, baseLotPickItem );

        if( shippingItem._id ) {

          pickItem.shippingItem = shippingItem._id;

        }

        lotPickItems.push( pickItem );
      }

    }
    else if( lot.numBoxes ) {

      for( let i=0; i<lot.numBoxes; i++ ) {
        lotPickItems.push( Object.assign( {}, baseLotPickItem ) );
      }

    }
    else {
      lotPickItems.push( baseLotPickItem );
    }

    return lotPickItems;
  }

  async getLineItemPickItems( lineItem ) {

    const basePickItem = this.getBasePickItem( lineItem );

    const shippingConfiguration = await this.shopify.getProductVariantShippingConfiguration( lineItem.variant.id );

    const lineItemPickItems = [];

    for( let i=0; i<lineItem.quantity ; i++ ) {

      if( shippingConfiguration && shippingConfiguration.length ) {

        for( let shippingConfigurationItem of shippingConfiguration ) {
          lineItemPickItems.push( Object.assign( { units: shippingConfigurationItem.units }, basePickItem, { lineItemCount: i+1 } ) );
        }

      }
      else {

        lineItemPickItems.push( Object.assign( { }, basePickItem, { lineItemCount: i+1 } ) );

      }

    }

    return lineItemPickItems;

  }

  async startOrderPick( orderId ) {

    const order = await this.shopifyOrders.getShopifyOrderById( orderId, { populate: [ 'orderPick' ] } );

    if( !order ) {
      throw new ResourceNotFoundError( { type: 'shopify order', id: orderId } );
    }

    if( !order.orderPick ) {

      const lots = await this.lotdb.getLotsByHandles( order.lineItems.map( _ => _.sku ) );

      let pickItems = [];

      for( let lineItem of order.lineItems ) {

        const lot = lots.find( _lot => _lot.handle === lineItem.sku );
        const isBundle = !!( lineItem.product.tags && lineItem.product.tags.includes( 'bundle' ) );

        let lineItemPickItems;
        if( isBundle ) {

          lineItemPickItems = await this.getBundlePickItems( lineItem );

        }
        else if( lot ) {

          lineItemPickItems = this.getLotPickItems( lineItem, lot );

        }
        else {

          lineItemPickItems = await this.getLineItemPickItems( lineItem );

        }

        pickItems = [ ...pickItems, ...lineItemPickItems ];

      }

      const data = {
        order: orderId,
        pickItems,
        isDeleted: false
      };

      const newShopifyOrderPick = new this.ShopifyOrderPick( data );
      await newShopifyOrderPick.save();

      order.orderPick = newShopifyOrderPick._id;
      await order.save().then( _order => _order.populate( 'orderPick' ).execPopulate() );

    }

    return { order };

  }

  async pickOrderPickItem( orderPickId, pickItemId, pkgId ) {

    const orderPick = await this.getOrderPickById( orderPickId );

    if( !orderPick ) {
      throw new ResourceNotFoundError( { type: 'shopify order pick', id: orderPickId } );
    }

    let pkg;
    if( pkgId ) {

      pkg = await this.inventoryCommander.getPackageById( pkgId );

      if( pkg && !pkg.isFulfilled ) {
        await pkg.fulfill();
      }
      else {
        throw new IllegalActionError( `Cannot fulfill package ${pkgId}!` );
      }

    }

    const pickItem = orderPick.pickItem( pickItemId, pkg && pkg._id );

    await orderPick.save();

    return {
      orderPick,
      pickItem
    };

  }

  async unpickOrderPickItem( orderPickId, pickItemId ) {

    const orderPick = await this.getOrderPickById( orderPickId, { populate: [ 'pickItems.pkg' ] } );

    if( !orderPick ) {
      throw new ResourceNotFoundError( { type: 'shopify order pick', id: orderPickId } );
    }

    const pickItem = orderPick.pickItems.id( pickItemId );

    if( !pickItem ) {
      throw new ChildResourceNotFoundError( {
        parentType: 'shopify order pick',
        parentId: orderPickId,
        childType: 'pick item',
        childId: pickItemId
      } );
    }

    pickItem.unpick();

    await orderPick.save();

    return {
      orderPick,
      pickItem
    };

  }

  async resetOrderPick( orderPickId ) {

    const orderPick = await this.getOrderPickById( orderPickId, { populate: [ 'pickItems.pkg' ] } );

    if( !orderPick ) {
      throw new ResourceNotFoundError( { type: 'shopify order pick', id: orderPickId } );
    }

    orderPick.reset( );

    await orderPick.save();

    return {
      orderPick
    };

  }

}

module.exports = FulfillmentCommander;