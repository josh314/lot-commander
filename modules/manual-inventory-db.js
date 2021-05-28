const mongoose = require('mongoose');

/************************************************
 * Helpers
 * =======
 * 
 *********/


 const manualInventoryQueryFilter = (  ) => {
  const filter = {
    isDeleted: false,
  };


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
  entries: [ {
    name: String,
    quantity: Number,
    units: String
  } ],
  notes: String,
  isDeleted: Boolean
}, { collection: 'manual-inventory', timestamps: true });


/***********************
 * ManualInventory pre-save hook
 * 
 ******/
// manualInventorySchema.pre( 'save', function(next) {

//   next();
// } );

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


  listManualInventories( { num, skip, sort, sortDir, filterParams } ) {

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
    
    return this.ManualInventory.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );
  
  }

  countManualInventories( filterParams ) {

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

    const newInventory = new this.ManualInventory( data );
    return newInventory.save();
  }

  getManualInventoryById( inventoryId ) {
    return this.ManualInventory.findOne( { _id: inventoryId } );
  }

  getManualInventoryById( inventoryId, { includeDeleted = false } = {} ) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( inventoryId );
    }
    catch {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    const q = this.ManualInventory.findOne( findDoc );

    return q.exec();

  }

  async deleteManualInventory( inventoryId ) {
 
    const inventory = await this.getManualInventoryById( inventoryId, { includeDeleted: false} );

    if( !inventory || inventory.isDeleted ) {
      throw new ResourceNotFoundError( { type: 'manual inventory', id: inventoryId } );
    }

    await inventory.delete();

    return { manualInventory: inventory };
  }


}

module.exports = {
  Client: ManualInventoryDbClient,
}