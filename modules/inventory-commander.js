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
 * Public Database Client
 * ======================
 * 
 ****/


class InventoryCommander {
  constructor({ mongooseConnection }) {
    this.conn = mongooseConnection;

    const pkg = require('./models/package');
    const incomingShipment = require('./models/incoming-shipment');

    // initialize models
    this.IncomingShipment = mongooseConnection.model('IncomingShipment', incomingShipment.schema);
    this.Package = mongooseConnection.model('Package', pkg.schema);
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

module.exports = InventoryCommander;