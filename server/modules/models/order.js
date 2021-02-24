const mongoose = require('mongoose');

/************************************************
 * Helpers
 * =======
 * 
 *********/


/************************************************
 * Mongoose data models
 * ====================
 ************************************************/

//================================================
// Fullfillment schemas

const fulfillmentSchema = mongoose.Schema(
  {
    lineItemId: mongoose.Schema.Types.ObjectId,
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

//================================================
// Order schemas

const discriminatorOpts = { discriminatorKey: 'source' };
const orderSchemaOpts = Object.assign(
  {
    discriminatorKey: 'source',
    collection: 'orders',
    timestamps: true,
    strict: true
  },
  discriminatorOpts
);

// Base schema
const orderSchema = mongoose.Schema(

  // the schema
  {
    isShipped: Boolean,
    isDeleted: Boolean,

    orderDate: Date,
    shippedDate: Date,
    deletedDate: Date,

    handle: String,
    customer: {
      name: String,
      phone: String,
      email: String
    },
    address: {
      street1: String,
      street2: String,
      state: String,
      zip: String,
    },

    lineItems: [ {
      name: String,
      isPicked: Boolean
    } ],
    fulfillments: [ fulfillmentSchema ]

    // TODO: line Items, fulfillments, isPicked

  },

  // options
  orderSchemaOpts
);

const shopifyOrderSchema = new mongoose.Schema(
  {
    shopifyOrderId: Number,
    shopifyCustomerId: Number
  },
  discriminatorOpts
);

// TODO: other discriminated order schemas: manual, bstock

// Register the fulfillment discriminators
const orderFulfillments = orderSchema.path('fulfillments');
const PackageFulfillment = orderFulfillments.discriminator('PackageFulfillment', packageFulfillmentSchema);


/***********************
 * Package pre-save hook
 * 
 ******/
orderSchema.pre( 'save', function(next) {

  if( typeof this.isShipped !== 'boolean' ) {
    this.isShipped = false;
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  if( !this.lineItems ) {
    this.lineItems = [];
  }

  if( !this.fulfillments ) {
    this.fulfillments = [];
  }

  next();
} );

orderSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
};

orderSchema.methods.ship = function() {
  this.isShipped = true;
  this.shippedDate = new Date();
  return this.save();
};

orderSchema.methods.unship = function() {
  this.isShipped = false;
  this.shippedDate = undefined;
  return this.save();
};

orderSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

orderSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};

orderSchema.methods.isPicked = function() {
  return this.lineItems.every( li => li.isPicked );
};

orderSchema.methods.isShopifyOrder = function() {
  return ( this.source === 'shopify' );
};

module.exports = {
  schema: {
    base: orderSchema,
    shopify: shopifyOrderSchema
  }
};