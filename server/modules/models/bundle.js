const mongoose = require('mongoose');

const BUNDLE_TYPE_ENUM = [
  'cosmetics',
  'cosmetics__maybelline',
  'cosmetics__loreal',
];

const bundleSchema = mongoose.Schema({
  handle: String,
  units: Number,
  type: { type: String, enum: BUNDLE_TYPE_ENUM },
  isPacked: Boolean,
  packedDate: Date,
  isDeleted: Boolean,
  deletedDate: Date,
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },
}, { collection: 'bundles', timestamps: true });

/***********************
 * Bundle pre-save hook
 * 
 ******/
bundleSchema.pre( 'save', function(next) {

  if( typeof this.isPacked !== 'boolean' ) {
    this.isPacked = false;
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false;
  }

  next();
} );

bundleSchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
};

bundleSchema.methods.pack = function( packageId ) {
  this.isPacked = true;
  this.packedDate = new Date();

  if( packageId ) {
    this.package = packageId;
  }

  return this.save();
};

bundleSchema.methods.unpack = function() {
  this.isPacked = false;
  this.packedDate = undefined;
  return this.save();
};

bundleSchema.methods.delete = function() {
  this.isDeleted = true;
  this.deletedDate = new Date();
  return this.save();
};

bundleSchema.methods.undelete = function() {
  this.isDeleted = false;
  this.deletedDate = undefined;
  return this.save();
};

module.exports = {
  schema: bundleSchema
};