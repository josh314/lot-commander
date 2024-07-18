const mongoose = require('mongoose');

/***********************
 * Product data schema
 * ===================
 *
 ******/

const productDataSchema = mongoose.Schema({

  barcode: String,
  title: String,
  brand: String,
  price: String,
  images: [
    String
  ]

});

module.exports = {
  productDataSchema
};