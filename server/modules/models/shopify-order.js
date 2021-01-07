const mongoose = require('mongoose');

/************************************************
 * Helpers
 * =======
 * 
 *********/

const matchLineItemToPackage = pkg => lineItem => {

  // TODO: this is super fucking brittle. Maybe better to use a product tag instead of lineItem.title even though that would require a DB lookup to resolve the product

  if( pkg.units > parseInt( lineItem.variant_title ) ) {
    return false;
  }

  if( pkg.type === 'personal_care' && lineItem.title === 'Personal Care/HBA Liquidation Lots (no cosmetics)') {
    return true;
  }
  else if( pkg.type === 'personal_care__cosmetics' && lineItem.title === 'Personal Care/HBA Liquidation Lots') {
    return true;
  }
  else if( pkg.type === 'general_merchandise' && lineItem.title === 'General Merchandise Variety') {
    return true;
  }
  else if( pkg.type === 'cosmetics' && lineItem.title === 'Brand Name Cosmetics') {
    return true;
  }
  else if( pkg.type === 'cosmetics__loreal' && lineItem.title === 'L\'Oreal Cosmetics Makeup Liquidation') {
    return true;
  }
  else if( pkg.type === 'cosmetics__maybelline' && lineItem.title === 'Maybelline Cosmetics Liquidation Lots') {
    return true;
  }
  else if( pkg.type === 'cosmetics__covergirl' && lineItem.title === 'COVERGIRL Cosmetics Liquidation Lots') {
    return true;
  }
  else {
    return false;
  }

}

const matchLineItemToLot = lot => lineItem => {

}

/************************************************
 * Mongoose data models
 * ====================
 ************************************************/

const fulfillmentSchema = mongoose.Schema(
  {
    lineItemId: Number,
    isComplete: Boolean
  },
  {
    discriminatorKey: 'type'
  }
);

const packageFulfillmentSchema = mongoose.Schema({
  packages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  }],
  units: Number
});

const lotFulfillmentSchema = mongoose.Schema({
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lot',
  },
  shippingItemsCount: Number
});

// TODO: pallet and manual fulfillment schemas

const shopifyOrderSchema = mongoose.Schema({
  isShipped: Boolean,
  fulfillments: [ fulfillmentSchema ],
  data: {
    id: Number,
    created_at: Date,
    closed_at: Date,
    financial_status: String,
    canceled_at: Date,
    order_number: Number,
    fulfillment_status: String,
    line_items: [ {
      id: Number,
      title: String,
      variant_title: String,
      quantity: Number,
      sku: String,
      name: String,
      variant_id: Number,
      product_id: Number
    } ],
    shipping_address: {
      first_name: String,
      last_name: String,
      address1: String,
      address2: String,
      city: String,
      zip: String,
      province: String,
      province_code: String
    },
    customer: {
      id: Number,
      first_name: String,
      last_name: String
    }
  }
}, { collection: 'shopify-orders', timestamps: true, strict: true });
const SHOPIFY_ORDER_SCHEMA_FIELDS = Object.keys(shopifyOrderSchema.paths).join(' ');

shopifyOrderSchema.pre('find', function() {
  this.select(SHOPIFY_ORDER_SCHEMA_FIELDS);
});
shopifyOrderSchema.pre('findOne', function() {
  this.select(SHOPIFY_ORDER_SCHEMA_FIELDS);
});

const orderFulfillments = shopifyOrderSchema.path('fulfillments');
const PackageFulfillment = orderFulfillments.discriminator('PackageFulfillment', packageFulfillmentSchema);


shopifyOrderSchema.methods.pickPackage = async function( pkg ) {

  const lineItems = this.data.line_items.filter( matchLineItemToPackage( pkg ) );

  if( !lineItems.length ) {
    // i.e. package doesn't match any lineItems
    throw new Error(`Invalid package for order.`);
  }

  const fulfillments = this.fulfillments || [];

  let success = false;
  for ( let li of lineItems ) {

    const lineItemId = li.id;
    const lineItemUnits = parseInt( li.variant_title );

    const lineItemFulfillment = fulfillments.find( f => f.lineItemId === lineItemId );

    if( lineItemFulfillment && lineItemFulfillment.isComplete ) {
      continue;
    }
    
    if( lineItemFulfillment  ) {

      if( lineItemFulfillment.units + pkg.units > lineItemUnits ) {
        continue;
      }

      lineItemFulfillment.units += pkg.units;

      lineItemFulfillment.packages.push( pkg._id );

      if( lineItemFulfillment.units === lineItemUnits ) {
        lineItemFulfillment.isComplete = true;
      } 

    }
    else {

      if( pkg.units > lineItemUnits ) {
        continue;
      }

      const data = {
        lineItemId: li.id,
        packages: [ pkg._id ],
        units: pkg.units,
        isComplete: pkg.units === lineItemUnits ? true : false
      };

      fulfillments.push( new PackageFulfillment( data ) );
    }

    success = true;
    break;

  }

  if( !success ) {
    throw new Error(`Excess package for order.`);
  }

  return this.save();

}

module.exports = {
  schema: shopifyOrderSchema
};