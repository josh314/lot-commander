const mongoose = require('mongoose');
const enums = require( '../modules/enums' );
const { shippingItemSchema } = require( './shipping-item' );
const { lotImageSchema } = require( './lot-image' );

/*************************************************
 * Enums
 *
 ********/

// define the schema for our lot model
const lotSchema = mongoose.Schema({
  handle: {
    type: String,
    required: true
  },
  lotNumber: Number,
  pallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryPallet'
  },
  description: String,
  type: { type: String, enum: enums.condition },
  category: String,
  totalUnits: Number,
  estimatedRetailValue: Number,
  priceValuePercentage: Number,
  status: { type: String, enum: enums.lotStatus, required: true },

  /*********** Listing properties ************/
  destinationMarketplace: { type: String, enum: enums.marketplace},
  submittedListings: [{
    _id: false,
    marketplace: String,
    dateSubmitted: Date,
    success: Boolean,
    message: String,
  }],
  listingData: {
    _id: false,
    title: String,
    body: String,
  },

  listedDate: Date,
  soldDate: Date,
  shippedDate: Date,

  images: [ lotImageSchema ],

  /*********** Manifest properties ************/
  unmanifested: Boolean, //marks a generic lot with unmanifested items.
  manifestId: String, // _id from manifets-db for manifests we've scanned ourselves
  thirdPartyManifests: [{
    _id: false,
    dbId: String,//either this or filename
    blockId: String,
    filename: String, //either this or dbId
  }],
  manifestFileLocation: String,

  /******* Shipping properties ***************/

  numBoxes: Number, // DEPRECATED: use shippingItems for new data

  packagingType: { type: String, enum: enums.packagingType },
  shippingItems: [ shippingItemSchema ],

  isDeleted: Boolean,

}, {collection: 'lots', timestamps: true, strict: true});



/***********************
 *  pre-save hook
 *
 ******/
lotSchema.pre( 'save', function(next) {

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  if( !this.priceValuePercentage || this.priceValuePercentage < 0 ) {
    this.priceValuePercentage = 15;
  }

  next();
} );

/***********************
 * Lot methods
 *
 *
  ******/

lotSchema.methods.edit = function( data ) {

  Object.assign( this, data );
  return this.save();

};

lotSchema.methods.ship = function() {

  this.status = 'Shipped';
  this.shippedDate = new Date();
  return this.save();

};

lotSchema.methods.unship = function() {

  this.status = 'Sold';
  this.shippedDate = undefined;
  return this.save();

};

lotSchema.methods.markAsSold = function( date ) {

  this.status = 'Sold';
  this.soldDate = date ? new Date( date ) : new Date();
  return this.save();

};

module.exports = {
  schema: lotSchema,
};