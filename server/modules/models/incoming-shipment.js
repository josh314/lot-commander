const mongoose = require('mongoose');

const incomingShipmentSchema = mongoose.Schema({
  handle: String,
  vendor: String,
  cost: Number,
  source: String,
  category: String,
  totalUnits: Number,
  carrier: String,
  arrivalDateExpected: Date,
  arrivalDate: Date,
  isReceived: Boolean,
  palletsExpected: [ {
    handle: String,
    units: Number,
    category: String,
    isAnonymous: Boolean
  } ],
  palletsReceived: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceivedPallet'
  } ],
  notes: String,
  isClosed: Boolean,
  closedDate: Date,
  isDeleted: Boolean,
  deletedDate: Date
  // TODO: manifests
}, { collection: 'incoming-shipments', timestamps: true });

/***********************
 * IncomingShipment pre-save hook
 * 
 ******/
incomingShipmentSchema.pre( 'save', function(next) {

  if( 'totalUnits' in this ) {

    if( this.totalUnits ) { // destroy pallet-level units if shipment-level units is set

      this.palletsExpected.forEach( p => p.set( { units: undefined } ) );

    }
    else { // unset shipment-level totalUnits if the data is falsey

      this.totalUnits = undefined;

    }

  }

  if( this.category ) { // set pallet categories from shipment-level category

    this.palletsExpected.forEach( p => p.category = this.category );

  }

  this.palletsExpected.forEach( p => {

    if( 'units' in p && !p.units ) { // unset pallet-level units if the data is falsey
      p.set( { units: undefined } );
    }

  });

  next();
} );

/***************************************
 * IncomingShipment document methods
 * 
 ******/

incomingShipmentSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
}

incomingShipmentSchema.methods.getPalletExpectedById = function( palletId ) {
  return this.palletsExpected.id( palletId );
}

incomingShipmentSchema.methods.getPalletExpectedByHandle = function( palletHandle ) {
  const found = this.palletsExpected.toObject().find( p => p.handle === palletHandle );
  return this.palletsExpected.id( found && found._id );
}

incomingShipmentSchema.methods.addPalletExpected = function( pallet ) {
  this.palletsExpected.push( pallet );
  return this.save();
}

incomingShipmentSchema.methods.removePalletExpected = async function( palletId ) {
  await this.palletsExpected.pull( palletId );
  return this.save();
}

incomingShipmentSchema.methods.editPalletExpected = async function( palletId, data ) {
  const pallet = this.palletsExpected.id( palletId );
  if( pallet ) {

    Object.assign( pallet, data );

    await this.save();
  }
  return this;
}

incomingShipmentSchema.methods.receive = function() {
  this.isReceived = true;
  this.arrivalDate = new Date();
  return this.save();
}

incomingShipmentSchema.methods.unreceive = function() {
  this.isReceived = false;
  this.arrivalDate = undefined;
  this.palletsReceived = [];
  return this.save();
}

incomingShipmentSchema.methods.addPalletReceived = function( palletId ) {
  this.palletsReceived.addToSet( palletId );
  return this.save();
}

incomingShipmentSchema.methods.receivePallet = incomingShipmentSchema.methods.addPalletReceived;

incomingShipmentSchema.methods.removePalletReceived = async function( palletId ) {
  await this.palletsReceived.pull( palletId );
  return this.save();
}

incomingShipmentSchema.methods.close = function() {
  this.isClosed = true;
  this.closedDate = new Date();
  return this.save();
}

incomingShipmentSchema.methods.reopen = function() {
  this.isClosed = false;
  this.closedDate = undefined;
  return this.save();
}

incomingShipmentSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
}

incomingShipmentSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
}

incomingShipmentSchema.methods.getCategory = function() {

  if( this.category ) {
    return this.category;
  }

  const category = this.palletsExpected[0].category;
  const allSameCategory = this.palletsExpected.every( p => p.category === category );

  if( allSameCategory ) {
    return category;
  }

}

module.exports = {
  schema: incomingShipmentSchema
};