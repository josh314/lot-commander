const mongoose = require('mongoose');

/************************************************
 * 
 * Mongoose data models
 * ====================
 * 
 ****/

const discriminatorOpts = { discriminatorKey: 'type' };
const eventSchemaOpts = Object.assign(
  { collection: 'events', timestamps: true },
  discriminatorOpts
);

const incomingShipmentRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'IncomingShipment'
};

const eventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
  },
  eventSchemaOpts
);

const createIncomingShipmentEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef
  },
  discriminatorOpts
);

//TODO: serialize entire object or at least some identifying data like handle? Otherwise, not much usable info.
const removeIncomingShipmentEventSchema = new mongoose.Schema( 
  {
    shipment: incomingShipmentRef
  },
  discriminatorOpts
);

const editIncomingShipmentEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef,
    path: String,
    oldValue: mongoose.Mixed,
    newValue: mongoose.Mixed
  },
  discriminatorOpts
);

const receiveIncomingShipmentEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef
  },
  discriminatorOpts
);

const unreceiveIncomingShipmentEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef
  },
  discriminatorOpts
);

const receiveIncomingShipmentPalletEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef,
    pallet: mongoose.Schema.Types.ObjectId
  },
  discriminatorOpts
);

/************************************************
 * 
 * Public Database Client
 * ======================
 * 
 ****/


class EventsDbClient {
  constructor( mongooseConnection ) {
    this.conn = mongooseConnection;

    // initialize models
    this.Event = mongooseConnection.model('Event', eventSchema);

    this.CreateIncomingShipmentEvent = this.Event.discriminator( 'create-incoming-shipment', createIncomingShipmentEventSchema );
    this.RemoveIncomingShipmentEvent = this.Event.discriminator( 'remove-incoming-shipment', removeIncomingShipmentEventSchema );
    this.EditIncomingShipmentEvent = this.Event.discriminator( 'edit-incoming-shipment', editIncomingShipmentEventSchema );
    this.ReceiveIncomingShipmentEvent = this.Event.discriminator( 'receive-incoming-shipment', receiveIncomingShipmentEventSchema );
    this.UnreceiveIncomingShipmentEvent = this.Event.discriminator( 'unreceive-incoming-shipment', unreceiveIncomingShipmentEventSchema );
    this.ReceiveIncomingShipmentPalletEvent = this.Event.discriminator( 'receive-incoming-shipment-pallet', receiveIncomingShipmentPalletEventSchema );

    // TODO:
    // add/remove documents
    // add/remove/edit expected pallets
    // edit received pallets

  }

  listIncomingShipmentEventsByShipmentId( shipmentId, opts={} ) {

    const sortParams = {
      createdAt : -1
    };
    
    const query = { shipment: mongoose.Types.ObjectId( shipmentId ) };

    if( opts.eventType ) {
      query.type = opts.eventType;
    }

    let q = this.Event.find( query ).skip( opts.skip || 0 ).limit( opts.num || 20 ).sort( sortParams );

    if( opts.populate ) {

      for( let path of opts.populate ) {

        q = q.populate( path );

      }

    }

    return q.exec();
  
  }

  createIncomingShipment( { user, shipment } ) {

    const e = new this.CreateIncomingShipmentEvent({ user: user && user._id , shipment: shipment && shipment._id  });

    return e.save();

  }

  removeIncomingShipment( { user, shipmentId } ) {

    const e = new this.RemoveIncomingShipmentEvent({ user: user && user._id , shipment: shipmentId  });

    return e.save();

  }

  editIncomingShipment( { user, shipment, path, oldValue, newValue } ) {

    if( !shipment || !path ) {
      return Promise.resolve( null );
    }

    const eventData = {
      user: user && user._id,
      shipment: shipment._id,
      path: path,
      oldValue: oldValue,
      newValue: newValue
    };

    const e = new this.EditIncomingShipmentEvent( eventData );

    return e.save();

  }


  receiveIncomingShipment( { user, shipment } ) {

    if( !shipment ) {
      return Promise.resolve( null );
    }

    const e = new this.ReceiveIncomingShipmentEvent({ user: user && user._id , shipment: shipment && shipment._id  });

    return e.save();

  }

  unreceiveIncomingShipment( { user, shipment } ) {

    if( !shipment ) {
      return Promise.resolve( null );
    }

    const e = new this.UnreceiveIncomingShipmentEvent({ user: user && user._id , shipment: shipment && shipment._id  });

    return e.save();

  }

  receiveIncomingShipmentPallet( { user, shipment } ) {

    if( !shipment ) {
      return Promise.resolve( null );
    }

    const pallet = shipment.palletsReceived[ shipment.palletsReceived.length - 1 ];

    const e = new this.ReceiveIncomingShipmentPalletEvent( { user: user && user._id , shipment: shipment && shipment._id, pallet: pallet && pallet._id } );

    return e.save();

  }

}

module.exports = {
  Client: EventsDbClient,
};