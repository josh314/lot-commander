const mongoose = require('mongoose');


// TODO: type Enum
const __TYPE_ENUM__ = [
  'single_line_text_field',
  'number_integer',
  'boolean',
  'color',
  'date',
  'date_time',
  'dimension',
  'file_reference',
  'json',
  'multi_line_text_field',
  'number_decimal',
  'page_reference',
  'product_reference',
  'rating',
  'url',
  'variant_reference',
  'volume',
  'weight'
];

/************************************************
 * Helpers
 * =======
 *
 *********/


const storeMetafieldSchemaQueryFilter = ( { namespace, key, type, description, includeDeleted } ) => {
  const filter = {};

  if ( namespace ) {
    filter.namespace = namespace;
  }

  if ( key ) {
    filter.key = key;
  }

  if ( type ) {
    filter.type = type;
  }

  if ( description ) {
    filter.description = description;
  }

  if( !includeDeleted ) {
    filter.isDeleted = false;
  }

  return filter;
};


/************************************************
 *
 * Mongoose data models
 * ====================
 *
 ****/

// StoreMetafieldSchema

const storeMetafieldSchemaSchema = mongoose.Schema({

  namespace: {
    type: String,
    required: true,
  },

  key: {
    type: String,
    required: true,
  },

  // type as per Shopify
  type: {
    type: String,
    enum: __TYPE_ENUM__,
  },

  // human-readable description. This is not replicated in Shopify
  description: {
    type: String,
    required: true,
  },

  // for hiding from the interface while preserving the data itself.
  isDeleted: Boolean

}, { collection: 'store-metafield-schema', timestamps: true });


/***********************
 * StoreMetafieldSchema methods
 *
 ******/

storeMetafieldSchemaSchema.methods.delete = function() {
  this.isDeleted = true;
  return this.save();
};

/************************************************
 *
 * Public Database Client
 * ======================
 *
 ****/


class StoreMetafieldSchemaDbClient {
  constructor({ mongooseConnection }) {
    this.conn = mongooseConnection;

    // initialize models
    this.StoreMetafieldSchema = mongooseConnection.model('StoreMetafieldSchema', storeMetafieldSchemaSchema);

  }


  listStoreMetafieldSchema( { num, skip, filterParams } ) {

    const filter = storeMetafieldSchemaQueryFilter(filterParams);

    const sortParams = {
      namespace : 1,
      key: 1
    };

    let q = this.StoreMetafieldSchema.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    return q.exec();

  }

  countStoreMetafieldSchema( filterParams ) {

    const filter = storeMetafieldSchemaQueryFilter(filterParams);

    return this.StoreMetafieldSchema.countDocuments( filter );

  }


  getStoreMetafieldSchemaById( storeMetafieldSchemaId, { includeDeleted = false } = {} ) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( storeMetafieldSchemaId );
    }
    catch ( _e ) {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.StoreMetafieldSchema.findOne( findDoc );

    return q.exec();

  }

}

module.exports = {
  Client: StoreMetafieldSchemaDbClient,
};