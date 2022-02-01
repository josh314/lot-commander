const mongoose = require('mongoose');

const inventoryPalletSchema = mongoose.Schema({
  handle: String,
  category: String,
  condition: String,
  cost: Number,
  units: Number,
  hasProblem: Boolean,
  note: String,
  isAnonymous: Boolean,
  isBrokendown: Boolean,
  brokendownDate: Date,
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomingShipment'
  },
  isReceived: Boolean,
  isDeleted: Boolean,
  deletedDate: Date
  //TODO: manifest, breakdown date
}, { collection: 'inventory-pallets', timestamps: true });

/***********************
 *  pre-save hook
 * 
 ******/
inventoryPalletSchema.pre( 'save', function(next) {

  if( typeof this.isReceived !== 'boolean' ) {
    this.isReceived = false;
  }

  if( typeof this.hasProblem !== 'boolean' ) {
    this.hasProblem = false;
  }

  if( typeof this.isAnonymous !== 'boolean' ) {
    this.isAnonymous = false;
  }

  if( typeof this.isBrokendown !== 'boolean' ) {
    this.isBrokendown = false;
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  // In the below, we normalize falsy properties for the string-valued fields. This actually completely removes the property
  if( !this.handle ) {
    this.handle = undefined;
  }

  if( !this.category ) {
    this.category = undefined;
  }

  if( !this.condition ) {
    this.condition = undefined;
  }

  if( !this.note ) {
    this.note = undefined;
  }

  next();
} );

inventoryPalletSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
};

inventoryPalletSchema.methods.breakdown = function() {
  this.isBrokendown = true;
  this.brokendownDate = new Date();
  return this.save();
};

inventoryPalletSchema.methods.unbreakdown = function() {
  this.isBrokendown = false;
  this.brokendownDate = undefined;
  return this.save();
};

inventoryPalletSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

inventoryPalletSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};


module.exports = {
  schema: inventoryPalletSchema
};