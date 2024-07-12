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
});

module.exports = {
  lotMediaDataSchema
};