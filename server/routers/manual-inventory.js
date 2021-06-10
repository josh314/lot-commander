const express = require('express');

const auth = require('../auth');

module.exports = routes;


/**********************************************
 * Helpers
 * =======
 * 
 *********/

const listManualInventoryFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  fp.includeDeleted = !!qp.include_deleted;

  return fp;
};

const populationPaths = qps => {

  const populationPaths = [];

  for( let [ key, value ] of Object.entries( qps ) ) {

    const m = key.match(/^populate_(.*)/);

    if( m && parseInt(value) ) {

      populationPaths.push( m[1] );

    }

  }

  return populationPaths;

};


function routes({ manualInventoryDb }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  // Read
  router.get(
    '/',
    auth.isAuthorized( 'VIEW_MANUAL_INVENTORY' ),
    listManualInventory
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_MANUAL_INVENTORY' ),
    countManualInventory
  );
  router.get(
    '/:inventoryId',
    auth.isAuthorized( 'VIEW_MANUAL_INVENTORY' ),
    getManualInventoryById
  );
  // Create
  router.post(
    '/new',
    auth.isAuthorized( 'CREATE_MANUAL_INVENTORY' ),
    createManualInventory
  );
  // Edit
  router.patch(
    '/:inventoryId',
    auth.isAuthorized( 'EDIT_MANUAL_INVENTORY' ),
    editManualInventory
  );
  // Delete
  router.delete(
    '/:inventoryId',
    auth.isAuthorized( 'DELETE_MANUAL_INVENTORY' ),
    deleteManualInventory
  );

  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/


  async function listManualInventory( req, res ) {

    const numPage = parseInt( req.query.num ) || 10;
    const page = parseInt( req.query.page ) || 1;
  
    const query = {
      // paging
      skip: ( page - 1 ) * numPage,
      num: numPage,

      // sorting
      sort: req.query.sort || "createdAt",
      sortDir: parseInt(req.query.sort_dir) || -1,

      // filters
      filterParams: listManualInventoryFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: populationPaths( req.query ),
    };

    const manualInventoryDocuments = await manualInventoryDb.listManualInventory(query);


    const manualInventory = manualInventoryDocuments.map( _ => Object.assign( {}, _._doc , { user: _.user && _.user.getPublicInfo ? _.user.getPublicInfo() : _.user })  );


    res.json( { manualInventory } );
  }

  async function countManualInventory( req, res ) {
  
    const count = await manualInventoryDb.countManualInventory( listManualInventoryFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
  }


  async function getManualInventoryById( req, res ) {

    const inventoryId = req.params.inventoryId;

    const populate = populationPaths( req.query );
    const includeDeleted = !!req.query.include_deleted;

    const inventory = await manualInventoryDb.getManualInventoryById( inventoryId, { populate, includeDeleted } );
    if( inventory ) {
      res.json( { manualInventory: inventory } );
    }
    else {
      res.json( { error: true, message: `No inventory found with _id ${inventoryId}.` } );
    }
  }

  async function createManualInventory( req, res ) {

    const data = Object.assign(
      {
        user: req.user
      },
      req.body
    );

    const manualInventory = await manualInventoryDb.createManualInventory( data );

    res.json( { manualInventory } );

  }

  async function editManualInventory( req, res ) {

    const inventoryId = req.params.inventoryId;

    const data = Object.assign(
      req.body
    );

    const manualInventory = await manualInventoryDb.editManualInventory( inventoryId, data );

    res.json( { manualInventory } );

  }

  async function deleteManualInventory( req, res ) {

    const inventoryId = req.params.inventoryId;

    const result = await manualInventoryDb.deleteManualInventory( inventoryId );

    res.json( result );

  }


  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}