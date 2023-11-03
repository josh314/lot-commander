const mongoose = require('mongoose');

const packageSchema = mongoose.Schema({
  handle: String,
  units: Number,

  productId: String,
  productTitle: String,

  category: String,
  condition: String,
  isInstantiated: Boolean,
  instantiatedDate: Date,
  isDeleted: Boolean,
  deletedDate: Date,
  pallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryPallet'
  },
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomingShipment'
  },

  isFulfilled: Boolean,
  fulfilledDate: Date

}, { collection: 'packages', timestamps: true });

/***********************
 * Package pre-save hook
 *
 ******/
packageSchema.pre( 'save', function(next) {

  if( typeof this.isInstantiated !== 'boolean' ) {
    this.isInstantiated = false;
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  if( typeof this.isFulfilled !== 'boolean' ) {
    this.isFulfilled = false;
  }

  next();
} );

packageSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
};

packageSchema.methods.instantiate = function() {
  this.isInstantiated = true;
  this.instantiatedDate = this.instantiatedDate || new Date();
  return this.save();
};

packageSchema.methods.uninstantiate = function() {
  this.isInstantiated = false;
  this.instantiatedDate = undefined;
  return this.save();
};

packageSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

packageSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};

packageSchema.methods.fulfill = function() {
  this.isFulfilled = true;
  this.fulfilledDate = new Date();
  return this.save();
};

packageSchema.methods.unfulfill = function() {
  this.isFulfilled = false;
  this.fulfilledDate = undefined;
  return this.save();
};

module.exports = {
  schema: packageSchema
};