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
});

lotMediaDataSchema.methods.finishProcessing = function( s3Location ) {
  this.s3 = s3Location;
  this.isProcessing = false;
  return this;
};

module.exports = {
  lotMediaDataSchema
};