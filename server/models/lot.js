const mongoose = require('mongoose');

/*************************************************
 * Enums
 *
 ********/

const statusEnum = ['In Preparation', 'Ready', 'Listed', 'Sold', 'Shipped', 'Error'];
const marketplaceEnum = ['bstock', 'wholesaleninjas'];
const typeEnum = ['shelf-pull', 'case-packed', 'customer returns', 'salvage'];
const packagingTypeEnum = ['box lot', 'pallets', 'pallets:bulky', 'pallets:oversized', 'truckloads'];
const weightUnitsEnum = [ 'pounds', 'ounces', 'grams', 'kilograms' ];
const lengthUnitsEnum = [ 'inches', 'feet', 'centimeters' ];

// define the schema for our lot model
const lotSchema = mongoose.Schema({
  handle: {
    type: String,
    // index: true,
    required: true,
    unique: true
  },
  pallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryPallet'
  },
  description: String,
  type: { type: String, enum: typeEnum },
  category: String,
  totalUnits: Number,
  estimatedRetailValue: Number,
  status: { type: String, enum: statusEnum, required: true },
  listedOn: [{ type: String, enum: marketplaceEnum }],
  soldOn: { type: String, enum: marketplaceEnum },
  destinationMarketplace: { type: String, enum: marketplaceEnum},
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

  packagingType: { type: String, enum: packagingTypeEnum },
  numBoxes: Number, // DEPRECATED: use shippingItems for new data
  shippingItems: [{
    _id: false,
    weight: Number,
    weightUnits: { type: String, enum: weightUnitsEnum },
    height: Number,
    heightUnits: { type: String, enum: lengthUnitsEnum },
    width: Number,
    widthUnits: { type: String, enum: lengthUnitsEnum },
    length: Number,
    lengthUnits: { type: String, enum: lengthUnitsEnum },
  }],

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

  next();
} );

module.exports = {
  schema: lotSchema,
  enums: {
    status: statusEnum,
    type: typeEnum,
    marketplace: marketplaceEnum,
    packagingType: packagingTypeEnum,
    weightUnits: weightUnitsEnum,
    lengthUnits: lengthUnitsEnum,
  }
};