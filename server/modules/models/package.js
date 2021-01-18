const mongoose = require('mongoose');

const PKG_TYPE_ENUM = [
  'cosmetics',
  'cosmetics__maybelline',
  'cosmetics__loreal',
  'general_merchandise',
  'nail_polish',
  'personal_care',
  'personal_care__cosmetics',
];

const packageSchema = mongoose.Schema({
  handle: String,
  units: Number,
  type: { type: String, enum: PKG_TYPE_ENUM },
  isFinished: Boolean,
  finishedDate: Date,
  isShipped: Boolean,
  shippedDate: Date,
  isDeleted: Boolean,
  deletedDate: Date,
  pallets: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceivedPallet'
  } ],
  // TODO: bundles
}, { collection: 'packages', timestamps: true });

/***********************
 * Package pre-save hook
 * 
 ******/
packageSchema.pre( 'save', function(next) {

  if( typeof this.isFinished !== 'boolean' ) {
    this.isFinished = false;
  }

  if( typeof this.isShipped !== 'boolean' ) {
    this.isShipped = false;
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  if( !this.pallets ) {
    this.pallets = [];
  }

  next();
} );

packageSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
}

packageSchema.methods.finish = function() {
  this.isFinished = true;
  this.finishedDate = this.finishedDate || new Date();
  return this.save();
};

packageSchema.methods.reopen = function() {
  this.isFinished = false;
  this.finishedDate = undefined;
  return this.save();
};

packageSchema.methods.ship = function() {
  this.isShipped = true;
  this.shippedDate = new Date();
  return this.save();
};

packageSchema.methods.unship = function() {
  this.isShipped = false;
  this.shippedDate = undefined;
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

packageSchema.methods.addPallet = function( palletId ) {
  this.pallets.addToSet( palletId );
  return this.save();
};

module.exports = {
  schema: packageSchema
};