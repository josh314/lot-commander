const mongoose = require('mongoose');

const { ResourceNotFoundError } = require('../errors');

/************************************************
 * Helpers
 * =======
 * 
 *********/


const manualInventoryQueryFilter = ( { includeDeleted } ) => {
  const filter = {};

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

// ManualInventory

const manualInventorySchema = mongoose.Schema({
  user:   {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  inventory: [ {
    name: String,
    quantity: Number
  } ],
  notes: String,
  isDeleted: Boolean
}, { collection: 'manual-inventory', timestamps: true });


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


  listManualInventory( { num, skip, sort, sortDir, filterParams, populate = []  } ) {

    const filter = manualInventoryQueryFilter(filterParams);

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'createdAt';
    }
  
    const sortParams = {
      [ sortField ] : sortDir || 1
    };


    let q = this.ManualInventory.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    for( let path of populate ) {

      q = q.populate( path );

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

      for( let path of populate ) {

        q = q.populate( path );

      }

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