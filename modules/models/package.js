const mongoose = require('mongoose');

const PKG_TYPE_ENUM = [
  'cosmetics',
  'cosmetics__maybelline',
  'cosmetics__loreal',
  'general_merchandise',
  'nail_polish',
  'personal_care',
  'personal_care__cosmetics',
];

const packageSchema = mongoose.Schema({
  handle: String,
  units: Number,
  type: [{ type: String, enum: PKG_TYPE_ENUM }],
  isFinished: Boolean,
  finishedDate: Date,
  isShipped: Boolean,
  shipDate: Date,
}, { collection: 'packages', timestamps: true });


packageSchema.methods.finish = function() {
  this.isFinished = true;
  this.finishedDate = this.finishedDate || new Date();
  return this.save();
}

packageSchema.methods.reopen = function() {
  this.isFinished = false;
  this.finishedDate = undefined;
  return this.save();
}

packageSchema.methods.ship = function() {
  this.isShipped = true;
  this.shipDate = new Date();
}

packageSchema.methods.unship = function() {
  this.isShipped = false;
  this.shippedDate = undefined;
  return this.save();
}

module.exports = {
  schema: packageSchema
};