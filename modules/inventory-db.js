const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

/************************************************
 * Helpers
 * =======
 * 
 *********/

const awaitingShipmentFilter = { isReceived: false };

const receivedShipmentFilter = { isReceived: true };

const hasProblemShipmentFilter = {
  $where: function(){

    if( this.isReceived === false ) {
      return false;
    }

    const received = this.palletsReceived;
    const expected = this.palletsExpected;

    if( !received || !expected ) {
      return true;
    }

    if( received.length !== expected.length ) {
      return true;
    }

    if( received.some( p => p.hasProblem ) ) {
      return true;
    }

    return expected.some( pe => { 
      return !received.find( pr => pr.handle === pe.handle );
    } );
  }
};

const noProblemShipmentFilter = {
  $where: function(){

    if( this.isReceived === false ) {
      return true;
    }

    const received = this.palletsReceived;
    const expected = this.palletsExpected;

    if( !received || !expected ) {
      return false;
    }

    if( received.length !== expected.length ) {
      return false;
    }

    if( received.some( p => p.hasProblem ) ) {
      return false;
    }

    return expected.every( pe => { 
      return !!received.find( pr => pr.handle === pe.handle );
    } );
  }
};

const awaitingOrHasProblemShipmentFilter = ( hasProblemDateArrivedStart ) => ({
  $or: [
    awaitingShipmentFilter,
    hasProblemDateArrivedStart ? 
      Object.assign( hasProblemShipmentFilter, { arrivalDate: { $gt: new Date(hasProblemDateArrivedStart) } } ) : 
      hasProblemShipmentFilter
  ]
})

const flawlessShipmentFilter = {
  $and: [
    receivedShipmentFilter,
    noProblemShipmentFilter
  ]
};

const withoutProblemShipmentFilter = {
  $or: [
    awaitingShipmentFilter,
    noProblemShipmentFilter
  ]
}

const shipmentQueryFilter = ( { isReceived, handle, vendor, hasProblem, hasProblemDateArrivedStart, includeClosed=false } ) => {
  const filter = {};

  if ( handle ) {
    filter.handle = handle;
  }
  if ( vendor ) {
    filter.vendor = vendor;
  }


  let shipmentReceivedStatusFilter;
  if( isReceived === true ) {

    if( hasProblem === false ) {

      shipmentReceivedStatusFilter = flawlessShipmentFilter;

    }
    else {

      shipmentReceivedStatusFilter = receivedShipmentFilter;

    }

  }
  else if ( isReceived === false ) {

    if( hasProblem === true ) {

      shipmentReceivedStatusFilter = awaitingOrHasProblemShipmentFilter( hasProblemDateArrivedStart );

    }
    else {

      shipmentReceivedStatusFilter = awaitingShipmentFilter;

    }

  }
  else {

    if( hasProblem === true ) {

      shipmentReceivedStatusFilter = hasProblemShipmentFilter;

    }
    else if( hasProblem === false ) {

      shipmentReceivedStatusFilter = withoutProblemShipmentFilter;

    }

  }

  if( shipmentReceivedStatusFilter ) {

    Object.assign( filter, shipmentReceivedStatusFilter );

  }

  if( !includeClosed ) {
    Object.assign( filter, { isClosed: { $not: { $eq: true } } } );
  }

  return filter;
}

const packageQueryFilter = ( { isShipped } ) => {
  const filter = {};

  return filter;
}

/************************************************
 * 
 * Mongoose data models
 * ====================
 * 
 ****/

// IncomingShipment

const incomingShipmentSchema = mongoose.Schema({
  handle: String,
  vendor: String,
  cost: Number,
  source: String,
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
  // TODO: manifests, costs, category
}, { collection: 'incoming-shipments', timestamps: true });


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

// Package

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
  type: [{ type: String, enum: PKG_TYPE_ENUM }],
  isShipped: Boolean,
  shipDate: Date,
}, { collection: 'packages', timestamps: true });

packageSchema.methods.markShipped = function() {
  this.isShipped = true;
  this.shipDate = new Date();
}

/************************************************
 * 
 * Public Database Client
 * ======================
 * 
 ****/


class InventoryDbClient {
  constructor({ mongooseConnection }) {
    this.conn = mongooseConnection;

    // initialize models
    this.IncomingShipment = mongooseConnection.model('IncomingShipment', incomingShipmentSchema);
    this.Package = mongooseConnection.model('Package', packageSchema);
  }

  //=====================================================
  // Shipments
  //

  listIncomingShipments( { num, skip, sort, sortDir, filterParams } ) {

    const filter = shipmentQueryFilter(filterParams);

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'createdAt';
    }
  
    const sortParams = {
      [ sortField ] : sortDir || 1
    };
    
    return this.IncomingShipment.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );
  
  }

  countIncomingShipments( filterParams ) {

    const filter = shipmentQueryFilter(filterParams);

    return this.IncomingShipment.countDocuments( filter );

  }

  createIncomingShipment( _data ) {

    const data = Object.assign(
      {
        isReceived: false,
        isClosed: false
      },
      _data
    );

    const newShipment = new this.IncomingShipment( data );
    return newShipment.save();
  }

  getIncomingShipmentById( shipmentId ) {
    return this.IncomingShipment.findOne( { _id: shipmentId } );
  }

  removeIncomingShipment( shipmentId ) {
    return this.IncomingShipment.deleteOne( { _id: shipmentId } );
  }

  //==========================================================
  // Packages
  //

  listPackages( { num, skip, sort, sortDir, filterParams } ) {

    const filter = packageQueryFilter(filterParams);

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'createdAt';
    }

    const sortParams = {
      [ sortField ] : sortDir || 1
    };

    return this.Package.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );
  
  }

  countPackages( filterParams ) {

    const filter = packageQueryFilter(filterParams);

    return this.Package.countDocuments( filter );

  }

  createPackage( _data ) {

    const data = Object.assign(
      {
        isShipped: false
      },
      _data
    );

    const newShipment = new this.Package( data );
    return newShipment.save();
  }

}

module.exports = {
  Client: InventoryDbClient,
}