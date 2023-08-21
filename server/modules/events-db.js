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

const inventoryPalletRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'InventoryPallet'
};

const packageRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Package'
};

const bundleRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Bundle'
};

const claimRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Claim'
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
 * Inventory Pallet Events
 *
 ****/

const createInventoryPalletEventSchema = new mongoose.Schema(
  {
    pallet: inventoryPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const deleteInventoryPalletEventSchema = new mongoose.Schema(
  {
    pallet: inventoryPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const editInventoryPalletEventSchema = new mongoose.Schema(
  {
    pallet: inventoryPalletRef,
    shipment: incomingShipmentRef,
    path: String,
    oldValue: mongoose.Mixed,
    newValue: mongoose.Mixed
  },
  discriminatorOpts
);

const breakdownInventoryPalletEventSchema = new mongoose.Schema(
  {
    pallet: inventoryPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const unbreakdownInventoryPalletEventSchema = new mongoose.Schema(
  {
    pallet: inventoryPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const repackInventoryPalletEventSchema = new mongoose.Schema(
  {
    pallet: inventoryPalletRef,
    shipment: incomingShipmentRef,
  },
  discriminatorOpts
);

const unrepackInventoryPalletEventSchema = new mongoose.Schema(
  {
    pallet: inventoryPalletRef,
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

const instantiatePackageEventSchema = new mongoose.Schema(
  {
    package: packageRef,
  },
  discriminatorOpts
);

const uninstantiatePackageEventSchema = new mongoose.Schema(
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

const addPackageInventoryPalletEventSchema = new mongoose.Schema(
  {
    package: packageRef,
    pallet: inventoryPalletRef
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

const packBundleEventSchema = new mongoose.Schema(
  {
    bundle: bundleRef,
    package: packageRef
  },
  discriminatorOpts
);


/************************************************
 * Claim Events
 *
 ****/

const createClaimEventSchema = new mongoose.Schema(
  {
    claim: claimRef,
  },
  discriminatorOpts
);

const deleteClaimEventSchema = new mongoose.Schema(
  {
    claim: claimRef,
  },
  discriminatorOpts
);

const closeClaimEventSchema = new mongoose.Schema(
  {
    claim: claimRef
  },
  discriminatorOpts
);

const reopenClaimEventSchema = new mongoose.Schema(
  {
    claim: claimRef
  },
  discriminatorOpts
);

const startOrderItemClaimEventSchema = new mongoose.Schema(
  {
    claim: claimRef,
    // Note: this is a subdocument on the claim so not a ref to another table
    orderItem: mongoose.Schema.Types.ObjectId,
  },
  discriminatorOpts
);

const deleteOrderItemClaimEventSchema = new mongoose.Schema(
  {
    claim: claimRef,
    // Note: this is a subdocument on the claim so not a ref to another table
    orderItem: mongoose.Schema.Types.ObjectId,
  },
  discriminatorOpts
);

const editOrderItemClaimEventSchema = new mongoose.Schema(
  {
    claim: claimRef,
    // Note: this is a subdocument on the claim so not a ref to another table
    orderItem: mongoose.Schema.Types.ObjectId,
    path: String,
    oldValue: mongoose.Mixed,
    newValue: mongoose.Mixed
  },
  discriminatorOpts
);


const setClaimToBeReviewedEventSchema = new mongoose.Schema(
  {
    claim: claimRef,
    toBeReviewed: Boolean
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
    addIncomingShipmentExpectedPalletEventSchema;
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

    this.CreateInventoryPalletEvent = this.Event.discriminator( 'create-inventory-pallet', createInventoryPalletEventSchema );
    this.DeleteInventoryPalletEvent = this.Event.discriminator( 'delete-inventory-pallet', deleteInventoryPalletEventSchema );
    this.EditInventoryPalletEvent = this.Event.discriminator( 'edit-inventory-pallet', editInventoryPalletEventSchema );
    this.BreakdownInventoryPalletEvent = this.Event.discriminator( 'breakdown-inventory-pallet', breakdownInventoryPalletEventSchema );
    this.UnbreakdownInventoryPalletEvent = this.Event.discriminator( 'unbreakdown-inventory-pallet', unbreakdownInventoryPalletEventSchema );
    this.RepackInventoryPalletEvent = this.Event.discriminator( 'repack-inventory-pallet', repackInventoryPalletEventSchema );
    this.UnrepackInventoryPalletEvent = this.Event.discriminator( 'unrepack-inventory-pallet', unrepackInventoryPalletEventSchema );

    this.CreatePackageEvent = this.Event.discriminator( 'create-package', createPackageEventSchema );
    this.EditPackageEvent = this.Event.discriminator( 'edit-package', editPackageEventSchema );
    this.InstantiatePackageEvent = this.Event.discriminator( 'instantiate-package', instantiatePackageEventSchema );
    this.UninstantiatePackageEvent = this.Event.discriminator( 'uninstantiate-package', uninstantiatePackageEventSchema );
    this.DeletePackageEvent = this.Event.discriminator( 'delete-package', deletePackageEventSchema );
    this.AddPackageInventoryPalletEvent = this.Event.discriminator( 'add-package-inventory-pallet', addPackageInventoryPalletEventSchema );

    this.CreateBundleEvent = this.Event.discriminator( 'create-bundle', createBundleEventSchema );
    this.EditBundleEvent = this.Event.discriminator( 'edit-bundle', editBundleEventSchema );
    this.DeleteBundleEvent = this.Event.discriminator( 'delete-bundle', deleteBundleEventSchema );
    this.PackBundleEvent = this.Event.discriminator( 'pack-bundle', packBundleEventSchema );

    this.CreateClaimEvent = this.Event.discriminator( 'create-claim', createClaimEventSchema );
    this.DeleteClaimEvent = this.Event.discriminator( 'delete-claim', deleteClaimEventSchema );
    this.CloseClaimEvent = this.Event.discriminator( 'close-claim', closeClaimEventSchema );
    this.ReopenClaimEvent = this.Event.discriminator( 'reopen-claim', reopenClaimEventSchema );
    this.SetClaimToBeReviewedEvent = this.Event.discriminator( 'set-claim-to-be-reviewed', setClaimToBeReviewedEventSchema );
    this.StartOrderItemClaimEvent = this.Event.discriminator( 'start-order-item-claim', startOrderItemClaimEventSchema );
    this.DeleteOrderItemClaimEvent = this.Event.discriminator( 'delete-order-item-claim', deleteOrderItemClaimEventSchema );
    this.EditOrderItemClaimEvent = this.Event.discriminator( 'edit-order-item-claim', editOrderItemClaimEventSchema );

    // TODO:
    // add/remove documents
    // change documents to restricted
    // edit inventory pallets
    // undelete shipment
    // undelete inventory pallets

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


  createInventoryPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.CreateInventoryPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  deleteInventoryPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteInventoryPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  editInventoryPallet( { user, palletId, shipmentId, path, oldValue, newValue } ) {

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

    const e = new this.EditInventoryPalletEvent( eventData );

    return e.save();

  }

  breakdownInventoryPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.BreakdownInventoryPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  unbreakdownInventoryPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.UnbreakdownInventoryPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  repackInventoryPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.RepackInventoryPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

    return e.save();

  }

  unrepackInventoryPallet( { user, palletId, shipmentId } ) {

    if( !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.UnrepackInventoryPalletEvent( { user: user && user._id , pallet: palletId , shipment: shipmentId } );

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

  instantiatePackage( { user, packageId } ) {

    if( !packageId ) {
      return Promise.resolve( null );
    }

    const e = new this.InstantiatePackageEvent( { user: user && user._id , package: packageId } );

    return e.save();

  }

  uninstantiatePackage( { user, packageId } ) {

    if( !packageId ) {
      return Promise.resolve( null );
    }

    const e = new this.UninstantiatePackageEvent( { user: user && user._id , package: packageId } );

    return e.save();

  }

  addPackageInventoryPallet( { user, packageId, palletId } ) {

    if( !packageId || !palletId ) {
      return Promise.resolve( null );
    }

    const e = new this.AddPackageInventoryPalletEvent( { user: user && user._id , package: packageId, pallet: palletId } );

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


  packBundle( { user, bundleId, packageId } ) {

    if( !bundleId ) {
      return Promise.resolve( null );
    }

    const e = new this.PackBundleEvent( { user: user && user._id , bundle: bundleId, package: packageId } );

    return e.save();

  }


  /************************************************
   * Register claim events
   *
   ****/

  createClaim( { user, claim } ) {

    if( !claim ) {
      return Promise.resolve( null );
    }

    const e = new this.CreateClaimEvent( { user: user && user._id , claim: claim._id } );

    return e.save();

  }

  deleteClaim( { user, claim } ) {

    if( !claim ) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteClaimEvent( { user: user && user._id , claim: claim._id } );

    return e.save();

  }

  closeClaim( { user, claimId } ) {

    if( !claimId ) {
      return Promise.resolve( null );
    }

    const e = new this.CloseClaimEvent( { user: user && user._id , claim: claimId } );

    return e.save();

  }

  reopenClaim( { user, claimId } ) {

    if( !claimId ) {
      return Promise.resolve( null );
    }

    const e = new this.ReopenClaimEvent( { user: user && user._id , claim: claimId } );

    return e.save();

  }

  setClaimToBeReviewed( { user, claimId, toBeReviewed } ) {

    if( !claimId ) {
      return Promise.resolve( null );
    }

    const e = new this.SetClaimToBeReviewedEvent( { user: user && user._id , claim: claimId, toBeReviewed } );

    return e.save();

  }

  startOrderItemClaim( { user, claimId, orderItemId } ) {

    if( !claimId || !orderItemId ) {
      return Promise.resolve( null );
    }

    const e = new this.StartOrderItemClaimEvent( { user: user && user._id , claim: claimId, orderItem: orderItemId } );

    return e.save();

  }

  deleteOrderItemClaim( { user, claimId, orderItemId } ) {

    if( !claimId || !orderItemId ) {
      return Promise.resolve( null );
    }

    const e = new this.DeleteOrderItemClaimEvent( { user: user && user._id , claim: claimId, orderItem: orderItemId } );

    return e.save();

  }

  editOrderItemClaim( { user, claimId, orderItemId, path, oldValue, newValue } ) {

    if( !claimId || !orderItemId ) {
      return Promise.resolve( null );
    }

    const eventData = {
      user: user && user._id,
      claim: claimId,
      orderItem: orderItemId,
      path,
      oldValue,
      newValue
    };

    const e = new this.EditOrderItemClaimEvent( eventData );

    return e.save();

  }

}

module.exports = {
  Client: EventsDbClient,
};