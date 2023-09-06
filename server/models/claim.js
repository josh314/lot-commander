const mongoose = require('mongoose');

const __RESOLUTION_TYPE_ENUM__ = [
  'REFUND',
  'DISCOUNT_CODE'
];

/*******************************
 * OrderItemClaimManifest schema
 * =============================
 *
 ******/

const orderItemClaimManifestSchema = mongoose.Schema({

  spreadsheetId: String,
  spreadsheetUrl: String,
  title: String,

});

orderItemClaimManifestSchema.methods.edit = function( editDoc ) {
  return Object.assign( this, editDoc );
};


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
  suggestedResolutionValue: Number,

});

orderItemClaimSchema.methods.edit = function( editDoc ) {

  const _editDoc = JSON.parse( JSON.stringify( editDoc ) );

  if( _editDoc.manifest && this.manifest && this.manifest.spreadsheetId ) {

    this.manifest.edit( _editDoc.manifest );

    delete _editDoc.manifest;
  }

  Object.assign( this, _editDoc );

  return this;
};

orderItemClaimSchema.methods.addManifest = function( { spreadsheetId, spreadsheetUrl, title } ) {

  if( !this.manifest || !this.manifest.spreadsheetId ) {

    this.manifest = {
      spreadsheetId,
      spreadsheetUrl,
      title,
    };

  }

  return this;
};

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
  discounts: [ {
    name: String,
    amount: Number,
  } ],
  manifestUrl: String,
  units: Number,
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lot'
  },

  claim: orderItemClaimSchema,

});


orderItemSchema.methods.hasClaim = function( ) {
  return this.claim && this.claim.createdAt;
};

orderItemSchema.methods.startClaim = function( agentId ) {

  if( !this.hasClaim() ) {

    this.claim = {
      createdAt: new Date(),
      agent: agentId,
      units: 0
    };

  }
  return this;
};

orderItemSchema.methods.editClaim = function( editDoc ) {

  if( this.hasClaim() ) {

    this.claim.edit( editDoc );

  }
  return this;
};

orderItemSchema.methods.addClaimManifest = function( { spreadsheetId, spreadsheetUrl, title } ) {

  if( this.hasClaim() ) {

    this.claim.addManifest( { spreadsheetId, spreadsheetUrl, title } );

  }
  return this;

};

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
  discounts: [ {
    name: String,
    amount: Number,
  } ],
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tickets: [ {
    ticketId: String,
    url: String
  } ],
  toBeReviewed: Boolean,
  notes: [ {
    content: String,
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: Date
  } ],

  isClosed: Boolean,
  closedDate: Date,

  totalSuggestedResolutionValue: Number,
  resolutionActions: [
    {
      amount: Number,
      type: { type: String, enum: __RESOLUTION_TYPE_ENUM__ },
    }
  ],

  isDeleted: Boolean,
  deletedDate: Date,

}, { collection: 'claims', timestamps: true });


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

claimSchema.addResolutionAction = function( amount, type ) {

  const _resolutionAction = {
    amount,
    type
  };

  this.resolutionActions.push( _resolutionAction );

  return this.save;
}

claimSchema.methods.close = function() {
  this.isClosed = true;
  this.closedDate = new Date();
  this.toBeReviewed = false;

//TODO: set the final values for the resolutionAmount, resolutionType, units at claim and orderItemClaim levels



  return this.save();
};

claimSchema.methods.reopen = function() {
  this.isClosed = false;
  this.closedDate = undefined;

//TODO: unset resolution values as needed

  return this.save();
};

claimSchema.methods.setToBeReviewed = function( value ) {
  this.toBeReviewed = value;
  return this.save();
};

claimSchema.methods.addNote = function( content, user ) {

  const newNote = {
    content,
    date: new Date()
  };

  if( user ) {
    newNote.agent = user._id;
  }

  this.notes.push( newNote );

  return this.save();
};

claimSchema.methods.setTickets = function( ticketIds ) {

  const newTickets = [];

  for( let ticketId of ticketIds ) {

    if( typeof ticketId === 'number' ) {
      ticketId = `${ticketId}`;
    }

    if( typeof ticketId !== 'string' ) {
      continue;
    }

    ticketId = ticketId.replace( '#' ,'' ); // remove initial hashes

    if( ticketId.match( /[^0-9]/ ) ) { // if any non-numerical characters
      continue;
    }

    const ticket = {
      ticketId,
      url: `https://wholesaleninjas.zendesk.com/agent/tickets/${ ticketId }`
    };

    newTickets.push( ticket );

  }

  this.tickets = newTickets;

  return this.save();
};

module.exports = {
  schema: claimSchema
};