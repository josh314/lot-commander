const mongoose = require('mongoose');

/***********************
 * PickItem schema
 * ===============
 *
 ******/


const pickItemSchema = mongoose.Schema({

  lineItemId: String, // compare against order.lineItems[].id
  lineItemCount: Number, // iterated for each identical line item

  name: String,
  sku: String,
  lot: { //
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lot'
  },
  productId: String,
  productTitle: String,
  variantId: String,
  variantTitle: String,

  bundleProductId: String,
  bundleProductTitle: String,
  bundleVariantId: String,
  bundleVariantTitle: String,

  units: Number,

  shippingItem: mongoose.Schema.Types.ObjectId, // compare against lot.shippingItems[]._id
  pkg: { //
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },
  isPicked: Boolean,
  pickedDate: Date,

});

pickItemSchema.methods.pick = function( pkg ) {
  this.isPicked = true;
  this.pickedDate = new Date();

  if( pkg ) {
    this.pkg = pkg;
  }

  return this;
};

pickItemSchema.methods.unpick = function( ) {

  this.isPicked = false;
  this.pickedDate = undefined;

  if( this.pkg && this.pkg.unfulfill ) {
    this.pkg.unfulfill();
  }

  this.pkg = undefined;

  return this;
};

/***********************
 * Order Pick schema
 * ===============
 *
 ******/

const shopifyOrderPickSchema = mongoose.Schema({
  order: { // parent shopify order
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopifyOrder'
  },
  pickItems: [ pickItemSchema ],

  isFinished: Boolean,
  finishedDate: Date,

  isDeleted: Boolean,
  deletedDate: Date,

}, { collection: 'shopify-order-picks', timestamps: true });


/*********
 * Methods
 *
 ******/

shopifyOrderPickSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

shopifyOrderPickSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};

shopifyOrderPickSchema.methods.finish = function() {

  if( !this.allItemsPicked() ) {
    return this;
  }

  this.isFinished = true;
  this.finishedDate = new Date();
  return this.save();
};

shopifyOrderPickSchema.methods.unfinish = function() {
  this.isFinished = false;
  this.finishedDate = undefined;
  return this.save();
};

shopifyOrderPickSchema.methods.reset = function() {

  for( let pickItem of this.pickItems ) {
    pickItem.unpick();
  }

  return this.unfinish();
};

shopifyOrderPickSchema.methods.allItemsPicked = function() {

  for( let pickItem of this.pickItems ) {

    if( !pickItem.isPicked ) {
      return false;
    }

  }
  return true;

};

shopifyOrderPickSchema.methods.pickItem = function( pickItemId, pkg ) {

  const pickItem = this.pickItems.id( pickItemId );

  if( pickItem ) {

    pickItem.pick( pkg );

  }

  return pickItem;
};

shopifyOrderPickSchema.methods.unpickItem = function( pickItemId ) {

  const pickItem = this.pickItems.id( pickItemId );

  if( pickItem ) {

    pickItem.unpick();

  }

  return pickItem;
};

/***************************
 * Export
 * =======
 *
 ***************/



module.exports = {
  schema: shopifyOrderPickSchema
};
