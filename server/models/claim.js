const mongoose = require('mongoose');

/*******************************
 * OrderItemClaimManifest schema
 * =============================
 *
 ******/

const orderItemClaimManifestSchema = mongoose.Schema({

  spreadsheetId: String,
  spreadsheetUrl: String,
  title: String,
  totalDefectiveUnits: Number,
  totalRefund: Number,

});

orderItemClaimManifestSchema.methods.edit = function( editDoc ) {
  return Object.assign( this, editDoc );
}


/***********************
 * OrderItemClaim schema
 * =====================
 *
 ******/

const orderItemClaimSchema = mongoose.Schema({

  createdAt: Date,
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  manifest: orderItemClaimManifestSchema,
  units: Number,

});

orderItemClaimSchema.methods.edit = function( editDoc ) {

  const _editDoc = JSON.parse( JSON.stringify( editDoc ) );

  if( _editDoc.manifest && this.manifest && this.manifest.spreadsheetId ) {

    this.manifest.edit( _editDoc.manifest );

    delete _editDoc.manifest;
  }

  Object.assign( this, _editDoc );

  return this;
}

orderItemClaimSchema.methods.addManifest = function( { spreadsheetId, spreadsheetUrl, title } ) {

  if( !this.manifest || !this.manifest.spreadsheetId ) {

    this.manifest = {
      spreadsheetId,
      spreadsheetUrl,
      title,
      totalDefectiveUnits: 0,
      totalRefund: 0,
    };

  }

  return this;
}

/***********************
 * OrderItem schema
 * ===============
 *
 ******/

const orderItemSchema = mongoose.Schema({

  name: String,
  sku: String,
  productId: String,
  productTitle: String,
  variantId: String,
  variantTitle: String,
  price: Number,
  pricePaid: Number,
  manifestUrl: String,
  units: Number,
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lot'
  },

  claim: orderItemClaimSchema,

});


orderItemSchema.methods.startClaim = function( agentId ) {

  if( !this.claim || !this.claim.createdAt ) {

    this.claim = {
      createdAt: new Date(),
      agent: agentId,
      units: 0
    };

  }
  return this;
}

orderItemSchema.methods.editClaim = function( editDoc ) {

  if( this.claim && this.claim.createdAt ) {

    this.claim.edit( editDoc );

  }
  return this;
}

orderItemSchema.methods.addClaimManifest = function( { spreadsheetId, spreadsheetUrl, title } ) {

  if( this.claim && this.claim.createdAt ) {

    this.claim.addManifest( { spreadsheetId, spreadsheetUrl, title } );

  }
  return this;

}

// orderItemSchema.virtual( 'refund' )
//   .get( function() {

//     // TODO: perform calculation based upon missing units, etc
//     return this.refund;

//   } );

/**************
 * Claim schema
 * ===============
 *
 ******/


const claimSchema = mongoose.Schema({
  // just store enough order info to lookup and retrieve the order from Shopify. We don't want to have to deal with compliance issues by storing personal information

  // Shopify's order number
  orderNumber: {
    type: String,
    required: true
  },
  // Shopify's order id
  orderId: {
    type: String,
    required: true
  },
  orderDate: Date,
  orderItems: [ orderItemSchema ],
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isClosed: Boolean,
  closedDate: Date,
  isDeleted: Boolean,
  deletedDate: Date, // TODO: necessary?
}, { collection: 'claims', timestamps: true });


/***************************************
 * Claim virtuals
 *
 ******/

claimSchema.virtual( 'refund' )
  .get( function() {

    return this.orderItems.reduce( ( acc, oi ) => acc + (oi.refund || 0), 0 );

  } );

claimSchema.virtual( 'totalPricePaid' )
  .get( function() {

    return this.orderItems.reduce( ( acc, oi ) => acc + oi.pricePaid, 0 );

  } );


claimSchema.virtual( 'totalPrice' )
  .get( function() {

    return this.orderItems.reduce( ( acc, oi ) => acc + oi.price, 0 );

  } );

/***************************************
 * Claim methods
 *
 ******/

claimSchema.methods.getOrderItem = function( orderItemId ) {
  return this.orderItems.id( orderItemId );
};

claimSchema.methods.startOrderItemClaim = async function( orderItemId, agentId ) {
  const orderItem = this.getOrderItem( orderItemId );

  if( orderItem ) {

    orderItem.startClaim( agentId );

    if( this.isModified() ) {

      await this.save();

    }

  }

  return orderItem;
};

claimSchema.methods.editOrderItemClaim = async function( orderItemId, editDoc ) {

  const orderItem = this.getOrderItem( orderItemId );

  if( orderItem ) {

    orderItem.editClaim( editDoc );

    if( this.isModified() ) {

      await this.save();

    }

  }

  return orderItem;
};

claimSchema.methods.updateOrderItemClaimUnits = function( orderItemId, units ) {
  return this.editOrderItemClaim( orderItemId, { units } );
};

claimSchema.methods.addOrderItemClaimManifest = async function( orderItemId, { spreadsheetId, spreadsheetUrl, title } ) {

  const orderItem = this.getOrderItem( orderItemId );

  if( orderItem ) {

    orderItem.addClaimManifest( { spreadsheetId, spreadsheetUrl, title } );

    if( this.isModified() ) {

      await this.save();

    }

  }

};

claimSchema.methods.deleteOrderItemClaim = async function( orderItemId ) {
  const orderItem = this.getOrderItem( orderItemId );
  if( orderItem.claim ) {

    orderItem.claim = undefined;
    await this.save();
  }
  return orderItem;
};

claimSchema.methods.delete = function( ) {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

claimSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};

claimSchema.methods.close = function() {
  this.isClosed = true;
  this.closedDate = new Date();
  return this.save();
};

claimSchema.methods.reopen = function() {
  this.isClosed = false;
  this.closedDate = undefined;
  return this.save();
};

module.exports = {
  schema: claimSchema
};