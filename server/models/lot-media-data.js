const mongoose = require('mongoose');
/*******************************
 * LotMediaDataSchema schema
 * =============================
 *
 ******/

const lotMediaDataSchema = mongoose.Schema({
  filename: String,
  s3: String,
  primary: Boolean,
  isProcessing: Boolean,
  processingFailed: Boolean,
});

lotMediaDataSchema.methods.finishProcessing = function( s3Location ) {
  this.s3 = s3Location;
  this.isProcessing = false;
  return this;
};

lotMediaDataSchema.methods.setProcessingFailed = function( ) {
  this.processingFailed = true;
  return this;
};

module.exports = {
  lotMediaDataSchema
};