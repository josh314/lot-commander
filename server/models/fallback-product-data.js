const mongoose = require('mongoose');
const { productDataSchema } = require( './product-data' );

const { extendSchema } = require( './mongoose-extend-schema' );

/*******************************
 * Fallback product data schema
 * ============================
 *
 ******/

const fallbackProductDataSchema = mongoose.Schema(
  {
    pattern: String, // a string to be compiled to regex
    data: extendSchema( productDataSchema, { _id: false } ),
  },
  {
    collection: 'fallback-product-data',
    timestamps: true
  }
);

module.exports = {
  schema: fallbackProductDataSchema
};