const { extendSchema } = require( './mongoose-extend-schema' );

const { dimensionalItemSchema } = require( './dimensional-item' );


/*******************************
 * FulfillmentItemSchema schema
 * =============================
 *
 ******/

const fulfillmentItemSchema = extendSchema( dimensionalItemSchema, {} );

module.exports = {
  fulfillmentItemSchema
};