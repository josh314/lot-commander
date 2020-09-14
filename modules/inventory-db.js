const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

/************************************************
 * 
 * Mongoose data models
 * ====================
 * 
 ****/

const incomingShipmentSchema = mongoose.Schema({
  handle: String,
  vendor: String,
  carrier: String,
  arrivalDateExpected: Date,
  arrivalDate: Date,
  isReceived: Boolean,
  pallets: [ {
    handle: String,
    units: Number,
    category: String,
    isReceived: Boolean 
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

  listIncomingShipments( { num, skip, sort, sortDir, isReceived  } ) {
    const query = {};

    if( isReceived !== undefined ) {
      query.isReceived = isReceived;
    }
    else {
      query.isReceived = false;
    }

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'arrivalDateExpected';
    }
  
    const sortParams = {
      [ sortField ] : sortDir || 1
    };
    
    return this.IncomingShipment.find( query ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );
  
  }

  countIncomingShipments( { isReceived } ) {

    const query = {};
  
    if( isReceived !== undefined ) {
      query.isReceived = isReceived;
    }
  
    return this.IncomingShipment.countDocuments( query );

  }

  createIncomingShipment( { handle, vendor, carrier, arrivalDateExpected, pallets = [] } ) {

    const data = {
      handle,
      vendor,
      carrier,
      arrivalDateExpected,
      pallets: pallets.map( _ => Object.assign( _, { isReceived: false } ) ),
      isReceived: false
    };

    const newShipment = new this.IncomingShipment(data);
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