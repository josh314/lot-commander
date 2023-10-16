const mongoose = require('mongoose');
/*******************************
 * LotImageSchema schema
 * =============================
 *
 ******/

const lotImageSchema = mongoose.Schema({
  filename: String,
  s3: String,
  primary: Boolean,
});

module.exports = {
  lotImageSchema
};