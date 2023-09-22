const mongoose = require('mongoose');

const inventoryPalletSchema = mongoose.Schema({
  handle: String,
  category: String,
  condition: String,
  cost: Number,
  units: Number,
  removedItems: [ Object ], // LEGACY
  splitGroups: [ {
    label: String,
    category: String,
    condition: String,
    toBeListed: Boolean,
    items: [ Object ]
  } ],
  splitFrom: { // parent pallet that this pallet was split from
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryPallet'
  },
  retailValue: Number,
  priceValuePercentage: Number,
  salePrice: Number,
  hasProblem: Boolean,
  note: String,
  isAnonymous: Boolean,
  toBeListed: Boolean,
  toBeProcessed: Boolean,
  processedDate: Date,
  isRepacked: Boolean,
  repackedDate: Date,
  isBrokendown: Boolean,
  brokendownDate: Date,
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomingShipment'
  },
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lot'
  },
  isReceived: Boolean,
  isDeleted: Boolean,
  deletedDate: Date
  //TODO: manifest, breakdown date
}, { collection: 'inventory-pallets', timestamps: true });

/***********************
 *  pre-save hook
 *
 ******/
inventoryPalletSchema.pre( 'save', function(next) {

  if( typeof this.isReceived !== 'boolean' ) {
    this.isReceived = false;
  }

  if( typeof this.hasProblem !== 'boolean' ) {
    this.hasProblem = false;
  }

  if( typeof this.isAnonymous !== 'boolean' ) {
    this.isAnonymous = false;
  }

  if( typeof this.toBeListed !== 'boolean' ) {
    this.toBeListed = false;
  }

  if( typeof this.toBeProcessed !== 'boolean' ) {
    this.toBeProcessed = false;
  }

  if( typeof this.isRepacked !== 'boolean' ) {
    this.isRepacked = false;
  }

  if( typeof this.isBrokendown !== 'boolean' ) {
    this.isBrokendown = false;
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  if( !this.priceValuePercentage || this.priceValuePercentage < 0 ) {
    this.priceValuePercentage = 15;
  }

  // In the below, we normalize falsy properties for the string-valued fields. This actually completely removes the property
  if( !this.handle ) {
    this.handle = undefined;
  }

  if( !this.category ) {
    this.category = undefined;
  }

  if( !this.condition ) {
    this.condition = undefined;
  }

  if( !this.note ) {
    this.note = undefined;
  }


  next();
} );

inventoryPalletSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
};

inventoryPalletSchema.methods.unlinkLot = function() {
  this.lot = undefined;
  return this.save();
};

inventoryPalletSchema.methods.breakdown = function() {
  this.isBrokendown = true;
  this.brokendownDate = new Date();
  return this.save();
};

inventoryPalletSchema.methods.unbreakdown = function() {
  this.isBrokendown = false;
  this.brokendownDate = undefined;
  return this.save();
};

inventoryPalletSchema.methods.repack = function() {
  this.isRepacked = true;
  this.repackedDate = new Date();
  return this.save();
};

inventoryPalletSchema.methods.unrepack = function() {
  this.isRepacked = false;
  this.repackedDate = undefined;
  return this.save();
};

inventoryPalletSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

inventoryPalletSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};


module.exports = {
  schema: inventoryPalletSchema
};