const mongoose = require('mongoose');
const productData = require( './product-data' );

const { extendSchema } = require( './mongoose-extend-schema' );

/*******************************
 * Fallback product data schema
 * ============================
 *
 ******/

const fallbackProductDataSchema = mongoose.Schema(
  {
    pattern: String, // a string to be compiled to regex
    data: extendSchema( productData.schema, { _id: false } ),
  },
  {
    collection: 'fallback-product-data',
    timestamps: true
  }
);

fallbackProductDataSchema.methods.getData = function() {
  const res = this.toObject().data;

  // rename "description" to "title"
  res.title = res.description || res.title;
  if( res.description ) {
    delete res.description;
  }
  return res;
};


module.exports = {
  schema: fallbackProductDataSchema
};