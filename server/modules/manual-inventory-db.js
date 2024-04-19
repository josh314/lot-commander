const mongoose = require('mongoose');

const { appendPopulationQueries } = require('../helpers');
const { ResourceNotFoundError } = require('../errors');

/************************************************
 * Helpers
 * =======
 *
 *********/


const manualInventoryQueryFilter = ( { includeDeleted, startDate, endDate, groups } ) => {
  const filter = {};

  if( !includeDeleted ) {
    filter.isDeleted = false;
  }

  if( startDate ) {

    filter.reportDate = filter.reportDate || {};
    filter.reportDate.$gte = startDate;

  }

  if( endDate ) {

    filter.reportDate = filter.reportDate || {};
    filter.reportDate.$lte = endDate;

  }

  if( groups ) {

    filter.groups = { $all: groups };

  }

  return filter;
};


/************************************************
 *
 * Mongoose data models
 * ====================
 *
 ****/

// ManualInventory

const manualInventorySchema = mongoose.Schema({

  // User making the report
  user:   {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // date that inventory was taken. Not to be confused with the timestamps which are metadata about the document itself
  reportDate: {
    type: Date,
    default: Date.now,
  },

  // the actual inventory items
  inventory: [ {
    name: String,
    quantity: Number
  } ],

  // Tags for grouping documents into sets
  groups: [ String ],

  // catchall notes
  notes: String,

  // for hiding from the interface while preserving the data itself.
  isDeleted: Boolean

}, { collection: 'manual-inventory', timestamps: true });

/***********************
 * pre-save hook
 *
 ******/
manualInventorySchema.pre( 'save', function(next) {

  if( ! this.reportDate ) {
    this.reportDate = new Date();
  }

  next();
} );

/***********************
 * ManualInventory methods
 *
 ******/

manualInventorySchema.methods.delete = function() {
  this.isDeleted = true;
  return this.save();
};

manualInventorySchema.methods.edit = function( data ) {
  Object.assign( this, data );
  return this.save();
};

manualInventorySchema.methods.addGroup = function( grp ) {

  if( ! this.groups.includes( grp ) ) {

    this.groups.push( grp );
    return this.save();

  }

};

// TODO: delete group

/************************************************
 *
 * Public Database Client
 * ======================
 *
 ****/


class ManualInventoryDbClient {
  constructor({ mongooseConnection }) {
    this.conn = mongooseConnection;

    // initialize models
    this.ManualInventory = mongooseConnection.model('ManualInventory', manualInventorySchema);

  }


  listManualInventory( { num, skip, sort, sortDir, filterParams, populate } ) {

    const filter = manualInventoryQueryFilter(filterParams);

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'reportDate';
    }

    const sortParams = {
      [ sortField ] : sortDir || 1
    };


    let q = this.ManualInventory.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    if( populate ) {
      q = appendPopulationQueries( q, populate );
    }

    return q.exec();

  }

  countManualInventory( filterParams ) {

    const filter = manualInventoryQueryFilter(filterParams);

    return this.ManualInventory.countDocuments( filter );

  }

  createManualInventory( _data ) {

    const data = Object.assign(
      {
        isDeleted: false,
      },
      _data
    );

    if( _data.user ) {
      _data.user = _data.user._id;
    }

    const newInventory = new this.ManualInventory( data );
    return newInventory.save();
  }

  getManualInventoryById( inventoryId, { populate, includeDeleted = false } = {} ) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( inventoryId );
    }
    catch ( _e ) {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.ManualInventory.findOne( findDoc );

    if( populate ) {

      q = appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  async deleteManualInventory( inventoryId ) {

    const inventory = await this.getManualInventoryById( inventoryId, { includeDeleted: false } );

    if( !inventory || inventory.isDeleted ) {
      throw new ResourceNotFoundError( { type: 'manual inventory', id: inventoryId } );
    }

    await inventory.delete();

    return { manualInventory: inventory };
  }

  async editManualInventory( inventoryId, _data ) {

    const inventory = await this.getManualInventoryById( inventoryId, { includeDeleted: false });

    if( !inventory ) {
      throw new Error(`NOT FOUND: manual inventory with _id ${inventoryId}`);
    }

    return inventory.edit( _data );
  }


}

module.exports = {
  Client: ManualInventoryDbClient,
};