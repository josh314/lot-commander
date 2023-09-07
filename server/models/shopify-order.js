const mongoose = require('mongoose');

const displayFulfillmentStatusEnum = [
  'FULFILLED',
  'IN_PROGRESS',
  'ON_HOLD',
  'OPEN',
  'PARTIALLY_FULFILLED',
  'PENDING_FULFILLMENT',
  'RESTOCKED',
  'SCHEDULED',
  'UNFULFILLED',
];

/***********************
 * LineItem schema
 * ===============
 *
 ******/


const lineItemSchema = mongoose.Schema({

  id: String, // graphQL ids
  name: String,
  sku: String,
  quantity: Number,
  unfulfilledQuantity: Number,
  product: {
    id: String,
    title: String,
    tags: [ String ],
    metafields: {
      'lot:estimatedRetailValue': Number,
      'lot:totalUnits': Number,
    },
  },
  variant: {
    id: String,
    title: String,
  },
  itemPrice: Number,
  discount: Number,

});

lineItemSchema.virtual( 'units' )
  .get( function() {

    if( this.product && this.product.metafields && this.product.metafields[ 'lot:totalUnits' ] ) {
      return parseInt( this.product.metafields[ 'lot:totalUnits' ] );
    }
    else if(
      this.variant &&
      this.variant.title &&
      parseInt( this.variant.title ) === parseInt( this.variant.title ) // This bizarre-ass check filters out NaN, because NaN!==NaN
    ) {

      return parseInt( this.variant.title );

    }
    else if( this.name.match(/- ([0-9]+)/) ) {
      return parseInt( this.name.match(/- ([0-9]+)/)[1] );
    }

  } );

lineItemSchema.methods.hasTag = tag => {
  if( this.product && Array.isArray( this.product.tags ) ) {
    return this.product.tags.includes( tag );
  }

  return false;
};


/***********************
 * Order schema
 * ===============
 *
 ******/

const shopifyOrderSchema = mongoose.Schema({
  id: String, // graphQL ids
  name: String,
  createdAt: Date,
  displayFulfillmentStatus: { type: String, enum: displayFulfillmentStatusEnum },
  closed: Boolean,
  cancelledAt: Date,
  lineItems: [ lineItemSchema ],
}, { collection: 'shopify-orders', timestamps: true });

shopifyOrderSchema.virtual( 'toBeFulfilled' )
  .get( function() {

    if( !this.cancelledAt && !this.closed ) {

      return [
        'IN_PROGRESS',
        'OPEN',
        'PARTIALLY_FULFILLED',
        'PENDING_FULFILLMENT',
        'UNFULFILLED',
      ].includes( this.displayFulfillmentStatus );

    }

    return false;

  } );

/***************************
 * Export
 * =======
 *
 ***************/

module.exports = {
  schema: shopifyOrderSchema
};
