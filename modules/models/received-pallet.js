const mongoose = require('mongoose');

const receivedPalletSchema = mongoose.Schema({
  handle: String,
  category: String,
  units: Number,
  hasProblem: Boolean,
  note: String,
  isAnonymous: Boolean,
  isBrokendown: Boolean,
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomingShipment'
  },
  //TODO: manifest, breakdown date
}, { collection: 'received-pallets', timestamps: true });

receivedPalletSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
}

receivedPalletSchema.methods.breakdown = function() {
  //TODO: breakdown date?
  this.isBrokendown = true;
  return this.save();
}

module.exports = {
  schema: receivedPalletSchema
};