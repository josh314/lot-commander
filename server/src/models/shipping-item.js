const mongoose = require('mongoose');
const enums = require( '../modules/enums' );
const {
  setPackagingTypeFromShippingItems,
} = require( '../helpers' );

/*******************************
 * ShippingItemSchema schema
 * =============================
 *
 ******/

const shippingItemSchema = mongoose.Schema({
  weight: Number,
  weightUnits: { type: String, enum: enums.weightUnits },
  height: Number,
  heightUnits: { type: String, enum: enums.lengthUnits },
  width: Number,
  widthUnits: { type: String, enum: enums.lengthUnits },
  length: Number,
  lengthUnits: { type: String, enum: enums.lengthUnits },
});


shippingItemSchema.methods.isPallet = function() {

  return this.weight === 2000 &&
          this.weightUnits === 'pounds' &&
          this.height === 60 &&
          this.heightUnits === 'inches' &&
          this.width === 48 &&
          this.widthUnits === 'inches' &&
          this.length === 48 &&
          this.lengthUnits === 'inches';

};

module.exports = {
  setPackagingTypeFromShippingItems,
  shippingItemSchema
};