const mongoose = require('mongoose');
const enums = require( '../modules/enums' );

/*******************************
 * Dimensional Item Schema
 * =============================
 *
 * This is a schema for a generic item with linear dimensions and weight.
 * It is meant to be copied/extended by use of the extendSchema function in the `mongoose-extend-schema.js` module.
 *
 ******/



const dimensionalItemSchema = mongoose.Schema( {
  weight: Number,
  weightUnits: { type: String, enum: enums.weightUnits },
  height: Number,
  heightUnits: { type: String, enum: enums.lengthUnits },
  width: Number,
  widthUnits: { type: String, enum: enums.lengthUnits },
  length: Number,
  lengthUnits: { type: String, enum: enums.lengthUnits },
} );


dimensionalItemSchema.methods.isPallet = function() {

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
  dimensionalItemSchema
};