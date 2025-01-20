const mongoose = require('mongoose');

const manifestSchema = mongoose.Schema({

  handle: {
    type: String,
    // index: true,
    required: true
  },

  description: String,

  inventory: [{
    barcode: String,
    asin: String,
    quantity: Number,
    description: String,
    brand: String,
    price: Number,
    isAggPrice: Boolean,
    images: [ String ],
    _id: false
  }],

}, { collection: 'manifests', timestamps: true } );

module.exports = {
  schema: manifestSchema,
};
