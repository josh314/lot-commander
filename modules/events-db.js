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

const receivedPalletRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ReceivedPallet'
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

/************************************************
 * Incoming Shipment Events
 * 
 ****/

const createIncomingShipmentEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef
  },
  discriminatorOpts
);

const deleteIncomingShipmentEventSchema = new mongoose.Schema( 
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

const closeIncomingShipmentEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef
  },
  discriminatorOpts
);

const reopenIncomingShipmentEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef
  },
  discriminatorOpts
);

/************************************************
 * Received Pallet Events
 * 
 ****/

const createReceivedPalletEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef,
    pallet: receivedPalletRef
  },
  discriminatorOpts
);

const deleteReceivedPalletEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef,
    pallet: receivedPalletRef
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
    this.DeleteIncomingShipmentEvent = this.Event.discriminator( 'delete-incoming-shipment', deleteIncomingShipmentEventSchema );
    this.EditIncomingShipmentEvent = this.Event.discriminator( 'edit-incoming-shipment', editIncomingShipmentEventSchema );
    this.ReceiveIncomingShipmentEvent = this.Event.discriminator( 'receive-incoming-shipment', receiveIncomingShipmentEventSchema );
    this.UnreceiveIncomingShipmentEvent = this.Event.discriminator( 'unreceive-incoming-shipment', unreceiveIncomingShipmentEventSchema );
    this.CloseIncomingShipmentEvent = this.Event.discriminator( 'close-incoming-shipment', closeIncomingShipmentEventSchema );
    this.ReopenIncomingShipmentEvent = this.Event.discriminator( 'reopen-incoming-shipment', reopenIncomingShipmentEventSchema );

    this.CreateReceivedPalletEvent = this.Event.discriminator( 'create-received-pallet', createReceivedPalletEventSchema );
    this.DeleteReceivedPalletEvent = this.Event.discriminator( 'delete-received-pallet', deleteReceivedPalletEventSchema );

    // TODO:
    // add/remove documents
    // change documents to restricted
    // add/remove/edit expected pallets
    // edit received pallets
    // undelete shipment
    // undelete received pallets

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


  /************************************************
   * Register shipment events
   * 
   ****/

  createIncomingShipment( { user, shipment } ) {

    const e = new this.CreateIncomingShipmentEvent({ user: user && user._id , shipment: shipment && shipment._id  });

    return e.save();

  }

  deleteIncomingShipment( { user, shipmentId } ) {

    const e = new this.DeleteIncomingShipmentEvent({ user: user && user._id , shipment: shipmentId  });

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

  closeIncomingShipment( { user, shipment } ) {

    if( !shipment ) {
      return Promise.resolve( null );
    }

    const e = new this.CloseIncomingShipmentEvent({ user: user && user._id , shipment: shipment && shipment._id  });

    return e.save();

  }

  reopenIncomingShipment( { user, shipment } ) {

    if( !shipment ) {
      return Promise.resolve( null );
    }

    const e = new this.ReopenIncomingShipmentEvent({ user: user && user._id , shipment: shipment && shipment._id  });

    return e.save();

  }

  /************************************************
   * Register pallet events
   * 
   ****/


  createReceivedPallet( { user, shipmentId, palletId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.CreateReceivedPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  deleteReceivedPallet( { user, shipmentId, palletId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteReceivedPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }


}

module.exports = {
  Client: EventsDbClient,
};