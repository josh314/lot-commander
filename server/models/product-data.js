const mongoose = require('mongoose');

/***********************
 * Product data schema
 * ===================
 *
 ******/

const productDataSchema = mongoose.Schema({

  barcode: String,
  asin: String,
  description: String,
  brand: String,
  price: Number,
  images: [ String ],

});

module.exports = {
  schema: productDataSchema
};