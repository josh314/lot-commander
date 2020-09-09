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
    _id: false,
    id: String,
    units: Number,
    category: String,
    isReceived: Boolean 
  } ],
  // TODO: BOL & other shipping docs, invoice, manifests,
}, { collection: 'incoming-shipments', timestamps: true });

incomingShipmentSchema.methods.receive = function() {
  this.isReceived = true;
}

incomingShipmentSchema.methods.receivePallet = async function( palletId ) {
  const pallet = this.pallets.find( p => p.id === palletId );
  if( pallet ) {
    pallet.isReceived = true;
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
    
    const q = this.IncomingShipment.find( query ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );
  
    return q.then( users => users.map( user => user.getPublicInfo() ) );
  }

  countIncomingShipments( { isReceived } ) {

    const query = {};
  
    if( isReceived !== undefined ) {
      query.isReceived = isReceived;
    }
  
    const q = this.IncomingShipment.countDocuments( query );
  
    return q;
  }

  createIncomingShipment( { handle, vendor, carrier, arrivalDateExpected, pallets = [] } ) {

    const data = {
      handle,
      vendor,
      carrier,
      arrivalDateExpected,
      pallets: pallets.map( _ => Object.assign( _, { isReceived: false } ) ),
    };

    const newShipment = new this.IncomingShipment(data);
    return newShipment.save();
  }

  getIncomingShipmentById( shipmentId ) {
    return this.IncomingShipment.findOne( { _id: shipmentId } );
  }

}

module.exports = {
  Client: InventoryDbClient,
}