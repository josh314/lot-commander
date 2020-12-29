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
    handle: String,
    hasProblem: Boolean,
    note: String,
    isAnonymous: Boolean
  } ],
  notes: String,
  isClosed: Boolean
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

incomingShipmentSchema.methods.addPalletReceived = function( pallet ) {
  this.palletsReceived.push( pallet );
  return this.save();
}

incomingShipmentSchema.methods.receivePallet = incomingShipmentSchema.methods.addPalletReceived;

incomingShipmentSchema.methods.removePalletReceived = async function( palletId ) {
  await this.palletsReceived.pull( palletId );
  return this.save();
}

incomingShipmentSchema.methods.editPalletReceived = async function( palletId, data ) {
  const pallet = this.palletsReceived.id( palletId );
  if( pallet ) {
    Object.assign( pallet, data );
    await this.save();
  }
  return this;
}

incomingShipmentSchema.methods.close = function() {
  this.isClosed = true;
  return this.save();
}

incomingShipmentSchema.methods.reopen = function() {
  this.isClosed = false;
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