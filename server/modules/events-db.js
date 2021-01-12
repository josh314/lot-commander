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

const addIncomingShipmentExpectedPalletEventSchema = new mongoose.Schema(
  {

    shipment: incomingShipmentRef,

    // Note: this is an expected pallet so not a ref to another table
    pallet: mongoose.Schema.Types.ObjectId

  },
  discriminatorOpts
);

const deleteIncomingShipmentExpectedPalletEventSchema = new mongoose.Schema(
  {

    shipment: incomingShipmentRef,

    data: {
      pallet: mongoose.Mixed
    }

  },
  discriminatorOpts
);

const editIncomingShipmentExpectedPalletEventSchema = new mongoose.Schema(
  {
    shipment: incomingShipmentRef,
    
    // Note: this is an expected pallet so not a ref to another table
    pallet: mongoose.Schema.Types.ObjectId,

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
    pallet: receivedPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const deleteReceivedPalletEventSchema = new mongoose.Schema(
  {
    pallet: receivedPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const editReceivedPalletEventSchema = new mongoose.Schema(
  {
    pallet: receivedPalletRef,
    shipment: incomingShipmentRef,
    path: String,
    oldValue: mongoose.Mixed,
    newValue: mongoose.Mixed
  },
  discriminatorOpts
);

const breakdownReceivedPalletEventSchema = new mongoose.Schema(
  {
    pallet: receivedPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const unbreakdownReceivedPalletEventSchema = new mongoose.Schema(
  {
    pallet: receivedPalletRef,
    shipment: incomingShipmentRef,
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
    addIncomingShipmentExpectedPalletEventSchema
    // initialize models
    this.Event = mongooseConnection.model('Event', eventSchema);

    this.CreateIncomingShipmentEvent = this.Event.discriminator( 'create-incoming-shipment', createIncomingShipmentEventSchema );
    this.DeleteIncomingShipmentEvent = this.Event.discriminator( 'delete-incoming-shipment', deleteIncomingShipmentEventSchema );
    this.EditIncomingShipmentEvent = this.Event.discriminator( 'edit-incoming-shipment', editIncomingShipmentEventSchema );
    this.AddIncomingShipmentExpectedPalletEvent = this.Event.discriminator( 'add-incoming-shipment-expected-pallet', addIncomingShipmentExpectedPalletEventSchema );
    this.DeleteIncomingShipmentExpectedPalletEvent = this.Event.discriminator( 'delete-incoming-shipment-expected-pallet', deleteIncomingShipmentExpectedPalletEventSchema );
    this.EditIncomingShipmentExpectedPalletEvent = this.Event.discriminator( 'edit-incoming-shipment-expected-pallet', editIncomingShipmentExpectedPalletEventSchema );
    this.ReceiveIncomingShipmentEvent = this.Event.discriminator( 'receive-incoming-shipment', receiveIncomingShipmentEventSchema );
    this.UnreceiveIncomingShipmentEvent = this.Event.discriminator( 'unreceive-incoming-shipment', unreceiveIncomingShipmentEventSchema );
    this.CloseIncomingShipmentEvent = this.Event.discriminator( 'close-incoming-shipment', closeIncomingShipmentEventSchema );
    this.ReopenIncomingShipmentEvent = this.Event.discriminator( 'reopen-incoming-shipment', reopenIncomingShipmentEventSchema );

    this.CreateReceivedPalletEvent = this.Event.discriminator( 'create-received-pallet', createReceivedPalletEventSchema );
    this.DeleteReceivedPalletEvent = this.Event.discriminator( 'delete-received-pallet', deleteReceivedPalletEventSchema );
    this.EditReceivedPalletEvent = this.Event.discriminator( 'edit-received-pallet', editReceivedPalletEventSchema );
    this.BreakdownReceivedPalletEvent = this.Event.discriminator( 'breakdown-received-pallet', breakdownReceivedPalletEventSchema );
    this.UnbreakdownReceivedPalletEvent = this.Event.discriminator( 'unbreakdown-received-pallet', unbreakdownReceivedPalletEventSchema );

    // TODO:
    // add/remove documents
    // change documents to restricted
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

    if( !shipmentId ) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteIncomingShipmentEvent({ user: user && user._id , shipment: shipmentId  });

    return e.save();

  }

  editIncomingShipment( { user, shipmentId, path, oldValue, newValue } ) {

    if( !shipmentId || !path ) {
      return Promise.resolve( null );
    }

    const eventData = {
      user: user && user._id,
      shipment: shipmentId,
      path,
      oldValue,
      newValue
    };

    const e = new this.EditIncomingShipmentEvent( eventData );

    return e.save();

  }

  addIncomingShipmentExpectedPallet( { user, shipmentId, palletId } ) {

    if( !shipmentId || !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.AddIncomingShipmentExpectedPalletEvent({ user: user && user._id , shipment: shipmentId , pallet: palletId });

    return e.save();

  }

  deleteIncomingShipmentExpectedPallet( { user, shipmentId, palletData } ) {

    if( !shipmentId || !palletData) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteIncomingShipmentExpectedPalletEvent({ user: user && user._id , shipment: shipmentId , data: { pallet: palletData } });

    return e.save();

  }

  editIncomingShipmentExpectedPallet( { user, shipmentId, palletId, path, oldValue, newValue } ) {

    if( !shipmentId || !palletId || !path ) {
      return Promise.resolve( null );
    }

    const eventData = {
      user: user && user._id,
      shipment: shipmentId,
      pallet: palletId,
      path,
      oldValue,
      newValue
    };

    const e = new this.EditIncomingShipmentExpectedPalletEvent( eventData );

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


  createReceivedPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.CreateReceivedPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  deleteReceivedPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteReceivedPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  editReceivedPallet( { user, palletId, shipmentId, path, oldValue, newValue } ) {

    if( !palletId || !path ) {
      return Promise.resolve( null );
    }

    const eventData = {
      user: user && user._id,
      pallet: palletId,
      shipment: shipmentId,
      path: path,
      oldValue: oldValue,
      newValue: newValue
    };

    const e = new this.EditReceivedPalletEvent( eventData );

    return e.save();

  }

  breakdownReceivedPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.BreakdownReceivedPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  unbreakdownReceivedPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.UnbreakdownReceivedPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

}

module.exports = {
  Client: EventsDbClient,
};