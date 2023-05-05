const mongoose = require('mongoose');

const packageSchema = mongoose.Schema({
  handle: String,
  units: Number,
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
  }
}, { collection: 'packages', timestamps: true });

/***********************
 * Package pre-save hook
 * 
 ******/
packageSchema.pre( 'save', function(next) {

  if( typeof this.isInstantiated !== 'boolean' ) {
    this.isInstantiated = false;
  }
  else if ( this.isInstantiated ) {
    this.instantiatedDate = new Date();
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
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

module.exports = {
  schema: packageSchema
};