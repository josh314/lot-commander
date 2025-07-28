const mongoose = require('mongoose');
const productData = require( './product-data' );

const { extendSchema } = require( './mongoose-extend-schema' );


const manifestSchema = mongoose.Schema({

  handle: {
    type: String,
    // index: true,
    required: true
  },

  description: String,

  inventory: [ extendSchema( productData.schema, { _id: false, quantity: Number } ) ],

}, { collection: 'manifests', timestamps: true } );

module.exports = {
  schema: manifestSchema,
};
