const mongoose = require('mongoose');
const Promise = require('bluebird');

const { ResourceNotFoundError } = require('../errors');

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
  const filter = {
    isDeleted: false,
  };

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
    const receivedPallet = require('./models/received-pallet');

    // initialize models
    this.IncomingShipment = mongooseConnection.model('IncomingShipment', incomingShipment.schema);
    this.Package = mongooseConnection.model('Package', pkg.schema);
    this.ReceivedPallet = mongooseConnection.model('ReceivedPallet', receivedPallet.schema);
  }

  //=====================================================
  // Shipments
  //

  listIncomingShipments( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

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
    
    let q = this.IncomingShipment.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    for( let path of populate ) {

      q = q.populate( path );

    }

    return q.exec();
  
  }

  countIncomingShipments( filterParams ) {

    const filter = shipmentQueryFilter(filterParams);

    return this.IncomingShipment.countDocuments( filter );

  }

  createIncomingShipment( _data ) {

    const data = Object.assign(
      {
        isReceived: false,
        isClosed: false,
        isDeleted: false
      },
      _data
    );

    const newShipment = new this.IncomingShipment( data );
    return newShipment.save();
  }

  getIncomingShipmentById( shipmentId, { populate, includeDeleted = false } = {} ) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId(shipmentId);
    }
    catch {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.IncomingShipment.findOne( findDoc );

    if( populate ) {

      for( let path of populate ) {

        q = q.populate( path );

      }

    }

    return q.exec();

  }

  async deleteIncomingShipment( shipmentId, { deletePallets } = {}) {
 
    const shipment = await this.getIncomingShipmentById( shipmentId, deletePallets ? { populate: [ 'palletsReceived' ] } : {} );

    if( !shipment || shipment.isDeleted) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( deletePallets ) {

      var pallets = await Promise.all( 
        Promise.map( shipment.palletsReceived, pallet => pallet.delete() )
      );

    }

    await shipment.delete();

    return { shipment, pallets };
  }

  async receiveIncomingShipment( shipmentId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( shipment.isReceived ) {
      return {};
    }

    await shipment.receive();

    return { shipment };

  }

  async unreceiveIncomingShipment( shipmentId, { deletePallets } = {}) {

    const shipment = await this.getIncomingShipmentById( shipmentId, deletePallets ? { populate: [ 'palletsReceived' ] } : {} );
    
    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( !shipment.isReceived ) {
      return {};
    }

    if( deletePallets ) {

      var pallets = await Promise.all( 
        Promise.map( shipment.palletsReceived, pallet => pallet.delete() )
      );

    }

    await shipment.unreceive();

    return { shipment, pallets };
  }

  async closeIncomingShipment( shipmentId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( shipment.isClosed ) {
      return {};
    }

    await shipment.close();

    return { shipment };

  }

  async reopenIncomingShipment( shipmentId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( !shipment.isClosed ) {
      return {};
    }

    await shipment.reopen();

    return { shipment };
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