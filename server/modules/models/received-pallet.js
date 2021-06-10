const mongoose = require('mongoose');

const receivedPalletSchema = mongoose.Schema({
  handle: String,
  category: String,
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
  isDeleted: Boolean,
  deletedDate: Date
  //TODO: manifest, breakdown date
}, { collection: 'received-pallets', timestamps: true });

/***********************
 * ReceivedPallet pre-save hook
 * 
 ******/
receivedPalletSchema.pre( 'save', function(next) {

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

  next();
} );

receivedPalletSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
};

receivedPalletSchema.methods.breakdown = function() {
  this.isBrokendown = true;
  this.brokendownDate = new Date();
  return this.save();
};

receivedPalletSchema.methods.unbreakdown = function() {
  this.isBrokendown = false;
  this.brokendownDate = undefined;
  return this.save();
};

receivedPalletSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

receivedPalletSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};


module.exports = {
  schema: receivedPalletSchema
};