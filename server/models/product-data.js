const mongoose = require('mongoose');

/***********************
 * Product data schema
 * ===================
 *
 ******/

const productDataSchema = mongoose.Schema({

  barcode: String,
  asin: String,
  title: String,
  description: String,
  brand: String,
  price: Number,
  images: [ String ],

}, { timestamps: true } ); // note that timestamps will be ignored when this is used as a subschema

module.exports = {
  schema: productDataSchema
};