const mongoose = require('mongoose');
const Promise = require('bluebird');

const { ResourceNotFoundError, ChildResourceNotFoundError } = require('../errors');

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

const palletQueryFilter = ( { handle, isBrokendown, isAnonymous, hasProblem, shipment } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }

  if( shipment ) {
    filter.shipment = shipment;
  }

  if( hasProblem !== undefined ) {
    filter.hasProblem = hasProblem;
  }

  if( isBrokendown !== undefined ) {
    filter.isBrokendown = isBrokendown;
  }

  if( isAnonymous !== undefined ) {
    filter.isAnonymous = isAnonymous;
  }

  return filter;
};

const packageQueryFilter = ( { isShipped } ) => {
  const filter = {};
  //TODO
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

    if( !shipment || shipment.isDeleted ) {
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

  async editIncomingShipment( shipmentId, _editDocument ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    try { 
      const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: shipment[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue ); 

      if( edits.length <= 0 ) {
        return {};
      }

      const editDocument = edits.reduce( (acc, _) => { 
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      await shipment.edit( editDocument );

      return { shipment, edits };
    }
    catch(e) {
      console.error(e);
      return {};
    }
  }

  async addIncomingShipmentExpectedPallet( shipmentId, palletData ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    await shipment.addPalletExpected( palletData );

    const pallet = shipment.getPalletExpectedByHandle( palletData.handle );

    return { shipment, pallet };

  }

  async removeIncomingShipmentExpectedPallet( shipmentId, palletId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const pallet = shipment.getPalletExpectedById( palletId );

    if( !pallet ) {
      throw new ChildResourceNotFoundError( {
        parentType: 'incoming shipment',
        parentId: shipmentId,
        childType: 'received pallet',
        childId: palletId
      } );
    }

    await shipment.removePalletExpected( palletId );

    return { shipment, pallet };

  }

  async editIncomingShipmentExpectedPallet( shipmentId, palletId, _editDocument ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const pallet = shipment.getPalletExpectedById( palletId );

    if( !pallet ) {
      throw new ChildResourceNotFoundError( {
        parentType: 'incoming shipment',
        parentId: shipmentId,
        childType: 'received pallet',
        childId: palletId
      } );
    }

    const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: pallet[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue ); 

    if( edits.length <= 0 ) {
      return {};
    }

    const editDocument = edits.reduce( (acc, _) => { 
      acc[_.path] = _.newValue;
      return acc;
    }, {});

    await shipment.editPalletExpected( palletId, editDocument );

    return { shipment, pallet, edits };
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

  async receiveIncomingShipmentPallet( shipmentId, _palletData ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const palletData = Object.assign(
      {
        shipment: shipment._id
      },
      _palletData
    );

    const pallet = await this.createReceivedPallet( palletData ); 

    await shipment.receivePallet( pallet._id );

    return { shipment, pallet };
  }

  //==========================================================
  // Received Pallets
  //


  listReceivedPallets( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = palletQueryFilter(filterParams);

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

    let q = this.ReceivedPallet.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    for( let path of populate ) {

      q = q.populate( path );

    }

    return q.exec();

  }

  countReceivedPallets( filterParams ) {

    const filter = palletQueryFilter(filterParams);

    return this.ReceivedPallet.countDocuments( filter );

  }

  createReceivedPallet( _data ) {

    const data = Object.assign(
      {
        hasProblem: false,
        isAnonymous: false,
        isBrokendown: false,
        isDeleted: false
      },
      _data
    );

    const newPallet = new this.ReceivedPallet( data );
    return newPallet.save();
  }

  getReceivedPalletById( palletId, { populate, includeDeleted = false } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( palletId );
    }
    catch {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.ReceivedPallet.findOne( findDoc );

    if( populate ) {

      for( let path of populate ) {

        q = q.populate( path );

      }

    }

    return q.exec();

  }

  async deleteReceivedPallet( palletId ) {

    const pallet = await this.getReceivedPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'received pallet', id: palletId } );
    }

    if( pallet.isDeleted ) {
      return {};
    }

    await pallet.delete();

    return { pallet };
  }

  async editReceivedPallet( palletId, _editDocument ) {

    const pallet = await this.getReceivedPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'received pallet', id: palletId } );
    }

    try { 
      const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: pallet[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue ); 

      if( edits.length <= 0 ) {
        return {};
      }

      const editDocument = edits.reduce( (acc, _) => { 
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      await pallet.edit( editDocument );

      return { pallet, edits };
    }
    catch(e) {
      console.error(e);
      return {};
    }

  }

  async breakdownReceivedPallet( palletId ) {

    const pallet = await this.getReceivedPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'received pallet', id: palletId } );
    }

    if( pallet.isBrokendown ) {
      return {};
    }

    await pallet.breakdown();

    return { pallet };

  }

  async unbreakdownReceivedPallet( palletId ) {

    const pallet = await this.getReceivedPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'received pallet', id: palletId } );
    }

    if( !pallet.isBrokendown ) {
      return {};
    }

    await pallet.unbreakdown();

    return { pallet };

  }

  async deleteIncomingShipmentReceivedPallet( shipmentId, palletId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const found = shipment.palletsReceived.includes( mongoose.Types.ObjectId(palletId) );

    if( found ) {

      var { pallet } = await this.deleteReceivedPallet( palletId );

      await shipment.removePalletReceived( palletId );
    }

    return { shipment, pallet };

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