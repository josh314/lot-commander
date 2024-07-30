const mongoose = require('mongoose');
const enums = require( '../modules/enums' );
const {
  ChildResourceNotFoundError,
  IllegalActionError,
} = require( '../errors' );
const {
  __DEFAULT_PRICE_VALUE_PCT__
} = require( '../constants' );
const {
  setPackagingTypeFromShippingItems,
  shippingItemSchema
} = require( './shipping-item' );
const { lotMediaDataSchema } = require( './lot-media-data' );

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
  destinationMarketplace: { type: String, enum: enums.marketplace },
  submittedListings: [{
    _id: false,
    marketplace: String,
    dateSubmitted: Date,
    success: Boolean,
    message: String,
    shopify: {
      store: String,
      productId: Number,
      productVariantId: Number,
      handle: String,
    }
  }],
  listingData: {
    _id: false,
    title: String,
    body: String,
  },

  listedDate: Date,
  soldDate: Date,
  shippedDate: Date,

  images: [ lotMediaDataSchema ],
  videos: [ lotMediaDataSchema ],

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
 *  Middleware
 *
 ******/

// Doing this here prevents errors from empty packagingType
lotSchema.pre( 'validate', function(next) {

  this.setPackagingTypeFromShippingItems();

  next();
} );

lotSchema.pre( 'save', function(next) {

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  if( !this.priceValuePercentage || this.priceValuePercentage < 0 ) {
    this.priceValuePercentage = __DEFAULT_PRICE_VALUE_PCT__;
  }

  next();
} );

/***********************
 * Lot methods
 *
 *
  ******/


lotSchema.methods.setPackagingTypeFromShippingItems = function() {
  return setPackagingTypeFromShippingItems( this );
};

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

lotSchema.methods.getMediaArray = function( mediaType ) {

  if( mediaType !== 'images' && mediaType !== 'videos' ) {
    throw new IllegalActionError( `Invalid media type: ${ mediaType }` );
  }

  return this[ mediaType ];
};

lotSchema.methods.getMedia = function( mediaId, mediaType ) {

  const arr = this.getMediaArray( mediaType );
  return arr.id( mediaId );

};

lotSchema.methods.addMedia = async function( media, mediaType, { save } = { save: true } ) {

  const arr = this.getMediaArray( mediaType );

  const _id = new mongoose.Types.ObjectId();
  media._id = _id;

  arr.push( media );

  if( save ) {
    await this.save();
  }

  return { lot: this, media };

};

lotSchema.methods.removeMedia = function( mediaId, mediaType, { save } = { save: true }  ) {

  const arr = this.getMediaArray( mediaType );

  const index = arr.findIndex( item => item._id.toString() === mediaId.toString() );

  if( index === -1 ) {
    throw new ChildResourceNotFoundError( {
      parentType: 'lot',
      parentId: this._id,
      childType: mediaType,
      childId: mediaId
    } );
  }

  arr.splice( index, 1 );

  return save ? this.save() : this;
};

lotSchema.methods.setPrimaryMedia = function( mediaId, mediaType, { save } = { save: true } ) {

  const arr = this.getMediaArray( mediaType );

  const foundMediaNewPrimary = arr.id( mediaId );
  if( !foundMediaNewPrimary ) {

    throw new ChildResourceNotFoundError( {
      parentType: 'lot',
      parentId: this._id,
      childType: mediaType,
      childId: mediaId
    } );

  }

  const oldPrimaryMedia = arr.find( item => item.primary );
  if( oldPrimaryMedia === foundMediaNewPrimary ){
    return this;
  }

  foundMediaNewPrimary.primary = true;
  if( oldPrimaryMedia ) {
    oldPrimaryMedia.primary = false;
  }

  return save ? this.save() : this;
};

lotSchema.methods.finishProcessingMedia = async function( mediaId, mediaType, s3Location, { save } = { save: true } ) {

  const arr = this.getMediaArray( mediaType );
  const media = arr.id( mediaId );
  if( media ) {
    media.finishProcessing( s3Location );
  }

  if( save ) {
    await this.save();
  }

  return { lot: this, media };

};

module.exports = {
  schema: lotSchema,
};