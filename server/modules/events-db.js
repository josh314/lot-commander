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

const packageRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Package'
};

const bundleRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Bundle'
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
 * Package Events
 * 
 ****/

const createPackageEventSchema = new mongoose.Schema(
  {
    package: packageRef,
  },
  discriminatorOpts
);

const editPackageEventSchema = new mongoose.Schema(
  {
    package: packageRef,
    path: String,
    oldValue: mongoose.Mixed,
    newValue: mongoose.Mixed
  },
  discriminatorOpts
);

const finishPackageEventSchema = new mongoose.Schema(
  {
    package: packageRef,
  },
  discriminatorOpts
);

const reopenPackageEventSchema = new mongoose.Schema(
  {
    package: packageRef,
  },
  discriminatorOpts
);

const deletePackageEventSchema = new mongoose.Schema(
  {
    package: packageRef,
  },
  discriminatorOpts
);

const addPackageReceivedPalletEventSchema = new mongoose.Schema(
  {
    package: packageRef,
    pallet: receivedPalletRef
  },
  discriminatorOpts
);

/************************************************
 * Package Events
 * 
 ****/

const createBundleEventSchema = new mongoose.Schema(
  {
    bundle: bundleRef,
  },
  discriminatorOpts
);

const editBundleEventSchema = new mongoose.Schema(
  {
    bundle: bundleRef,
    path: String,
    oldValue: mongoose.Mixed,
    newValue: mongoose.Mixed
  },
  discriminatorOpts
);

const deleteBundleEventSchema = new mongoose.Schema(
  {
    bundle: bundleRef,
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

    this.CreatePackageEvent = this.Event.discriminator( 'create-package', createPackageEventSchema );
    this.EditPackageEvent = this.Event.discriminator( 'edit-package', editPackageEventSchema );
    this.FinishPackageEvent = this.Event.discriminator( 'finish-package', finishPackageEventSchema );
    this.ReopenPackageEvent = this.Event.discriminator( 'reopen-package', reopenPackageEventSchema );
    this.DeletePackageEvent = this.Event.discriminator( 'delete-package', deletePackageEventSchema );
    this.AddPackageReceivedPalletEvent = this.Event.discriminator( 'add-package-received-pallet', addPackageReceivedPalletEventSchema );

    this.CreateBundleEvent = this.Event.discriminator( 'create-bundle', createBundleEventSchema );
    this.EditBundleEvent = this.Event.discriminator( 'edit-bundle', editBundleEventSchema );
    this.DeleteBundleEvent = this.Event.discriminator( 'delete-bundle', deleteBundleEventSchema );

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


  /************************************************
   * Register package events
   * 
   ****/

  createPackage( { user, packageId } ) {

    if( !packageId ) {
      return Promise.resolve( null );
    }

    const e = new this.CreatePackageEvent( { user: user && user._id , package: packageId } );

    return e.save();

  }

  deletePackage( { user, packageId } ) {

    if( !packageId ) {
      return Promise.resolve( null );
    }

    const e = new this.DeletePackageEvent( { user: user && user._id , package: packageId } );

    return e.save();

  }

  editPackage( { user, packageId, path, oldValue, newValue } ) {

    if( !packageId || !path ) {
      return Promise.resolve( null );
    }

    const eventData = {
      user: user && user._id,
      package: packageId,
      path: path,
      oldValue: oldValue,
      newValue: newValue
    };

    const e = new this.EditPackageEvent( eventData );

    return e.save();

  }

  finishPackage( { user, packageId } ) {

    if( !packageId ) {
      return Promise.resolve( null );
    }

    const e = new this.FinishPackageEvent( { user: user && user._id , package: packageId } );

    return e.save();

  }

  reopenPackage( { user, packageId } ) {

    if( !packageId ) {
      return Promise.resolve( null );
    }

    const e = new this.ReopenPackageEvent( { user: user && user._id , package: packageId } );

    return e.save();

  }

  addPackageReceivedPallet( { user, packageId, palletId } ) {

    if( !packageId || !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.AddPackageReceivedPalletEvent( { user: user && user._id , package: packageId, pallet: palletId } );

    return e.save();

  }


  /************************************************
   * Register bundle events
   * 
   ****/

  createBundle( { user, bundleId } ) {

    if( !bundleId ) {
      return Promise.resolve( null );
    }

    const e = new this.CreateBundleEvent( { user: user && user._id , bundle: bundleId } );

    return e.save();

  }

  deleteBundle( { user, bundleId } ) {

    if( !bundleId ) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteBundleEvent( { user: user && user._id , bundle: bundleId } );

    return e.save();

  }

  editBundle( { user, bundleId, path, oldValue, newValue } ) {

    if( !bundleId || !path ) {
      return Promise.resolve( null );
    }

    const eventData = {
      user: user && user._id,
      bundle: bundleId,
      path: path,
      oldValue: oldValue,
      newValue: newValue
    };

    const e = new this.EditBundleEvent( eventData );

    return e.save();

  }


}

module.exports = {
  Client: EventsDbClient,
};