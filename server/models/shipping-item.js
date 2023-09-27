const mongoose = require('mongoose');
const enums = require( '../modules/enums' );

/*******************************
 * ShippingItemSchema schema
 * =============================
 *
 ******/

const shippingItemSchema = mongoose.Schema({
  _id: false,
  weight: Number,
  weightUnits: { type: String, enum: enums.weightUnits },
  height: Number,
  heightUnits: { type: String, enum: enums.lengthUnits },
  width: Number,
  widthUnits: { type: String, enum: enums.lengthUnits },
  length: Number,
  lengthUnits: { type: String, enum: enums.lengthUnits },
});

module.exports = {
  shippingItemSchema
};