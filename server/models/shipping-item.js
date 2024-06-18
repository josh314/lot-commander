const {
  setPackagingTypeFromShippingItems,
} = require( '../helpers' );

const { extendSchema } = require( './mongoose-extend-schema.js' );

const { dimensionalItemSchema } = require( './dimensional-item' );


/*******************************
 * ShippingItemSchema schema
 * =============================
 *
 ******/

const shippingItemSchema = extendSchema( dimensionalItemSchema, {} );

module.exports = {
  setPackagingTypeFromShippingItems,
  shippingItemSchema
};