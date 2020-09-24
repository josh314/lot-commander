const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

/************************************************
 * Helpers
 * =======
 * 
 *********/

const incompleteShipmentFilter = {
  isReceived: true,
  "pallets.isReceived": false
};

const awaitingShipmentFilter = { isReceived: false };

const receivedShipmentFilter = { isReceived: true };

const awaitingAndIncompleteShipmentFilter = ( isIncompleteDateArrived ) => ({
  $or: [
    awaitingShipmentFilter,
    isIncompleteDateArrived ? Object.assign( incompleteShipmentFilter, { arrivalDate: { $gt: new Date(isIncompleteDateArrived) } } ) : incompleteShipmentFilter
  ]
})

const completeShipmentFilter = {
  $and: [
    receivedShipmentFilter,
    { // all pallets are received
      $where: function(){ return this.pallets.every( function(p) { return p.isReceived } ) }
    }
  ]
};

const withoutIncompleteShipmentFilter = {
  $or: [
    awaitingShipmentFilter,
    completeShipmentFilter
  ]
}

const shipmentQueryFilter = ( { isReceived, handle, vendor, isIncomplete, isIncompleteDateArrived } ) => {
  const filter = {};

  if ( handle ) {
    filter.handle = handle;
  }
  if ( vendor ) {
    filter.vendor = vendor;
  }


  let shipmentReceivedStatusFilter;
  if( isReceived === true ) {

    if( isIncomplete === false ) {

      shipmentReceivedStatusFilter = completeShipmentFilter;

    }
    else {

      shipmentReceivedStatusFilter = receivedShipmentFilter;

    }

  }
  else if ( isReceived === false ) {

    if( isIncomplete === true ) {

      shipmentReceivedStatusFilter = awaitingAndIncompleteShipmentFilter( isIncompleteDateArrived );

    }
    else {

      shipmentReceivedStatusFilter = awaitingShipmentFilter;

    }

  }
  else {

    if( isIncomplete === true ) {

      shipmentReceivedStatusFilter = incompleteShipmentFilter;

    }
    else if( isIncomplete === false ) {

      shipmentReceivedStatusFilter = withoutIncompleteShipmentFilter;

    }

  }

  if( shipmentReceivedStatusFilter ) {

    Object.assign( filter, shipmentReceivedStatusFilter );

  }

  return filter;
}

/************************************************
 * 
 * Mongoose data models
 * ====================
 * 
 ****/

const incomingShipmentSchema = mongoose.Schema({
  handle: String,
  vendor: String,
  cost: Number,
  source: String,
  carrier: String,
  arrivalDateExpected: Date,
  arrivalDate: Date,
  isReceived: Boolean,
  pallets: [ {
    handle: String,
    units: Number,
    category: String,
    isReceived: Boolean,
  } ],
  // TODO: manifests, costs, total units, category
}, { collection: 'incoming-shipments', timestamps: true });


incomingShipmentSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
}

incomingShipmentSchema.methods.addPallet = function( pallet ) {
  pallet.isReceived = false;
  this.pallets.push( pallet );
  return this.save();
}

incomingShipmentSchema.methods.removePallet = async function( palletId ) {
  await this.pallets.pull( palletId );
  return this.save();
}

incomingShipmentSchema.methods.editPallet = async function( palletId, data ) {
  const pallet = this.pallets.id( palletId );
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
  return this.save();
}

incomingShipmentSchema.methods.receivePallet = async function( palletId ) {
  const pallet = this.pallets.id( palletId );
  if( pallet ) {
    pallet.isReceived = true;
    await this.save();
  }
  return this;
}

incomingShipmentSchema.methods.unreceivePallet = async function( palletId ) {
  const pallet = this.pallets.id( palletId );
  if( pallet ) {
    pallet.isReceived = false;
    await this.save();
  }
  return this;
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
  }

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
      },
      _data,
      {
        pallets: ( _data.pallets || [] ).map( _ => Object.assign( _, { isReceived: false } ) ),
      }
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

}

module.exports = {
  Client: InventoryDbClient,
}