const mongoose = require('mongoose');
const enums = require( '../modules/enums' );
const { shippingItemSchema } = require( './shipping-item' );

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
  listedOn: [{ type: String, enum: enums.marketplace }],
  soldOn: { type: String, enum: enums.marketplace },
  destinationMarketplace: { type: String, enum: enums.marketplace},
  listings: [{//delete
    platform: String,
    body: String,
    _id: false,
  }],
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
  images: [{
    filename: String,
    s3: String,
    primary: Boolean,
    _id: false,
  }],

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

module.exports = {
  schema: lotSchema,
};