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

  return fp;
};

const populationPaths = qps => {

  const populationPaths = [];

  for( let [ key, value ] of Object.entries( qps ) ) {

    const m = key.match(/^populate_(.*)/)

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

  router.get(
    '/',
    auth.isAuthorized( 'VIEW_PACKAGE' ),
    listManualInventory
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_MANUAL_INVENTORY' ),
    countManualInventory
  );
  // Create
  router.post(
    '/new',
    auth.isAuthorized( 'CREATE_MANUAL_INVENTORY' ),
    createManualInventory
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
      sort: req.query.sort,
      sortDir: parseInt(req.query.sort_dir),

      // filters
      filterParams: listManualInventoryFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: populationPaths( req.query ),
    };

    const manualInventoryDocuments = await manualInventoryDb.listManualInventory(query);


    const manualInventory = manualInventoryDocuments.map( _ => Object.assign( {}, _._doc , { user: _.user && _.user.getPublicInfo ? _.user.getPublicInfo() : _.user })  );


    res.json( { manualInventory } );
  };

  async function countManualInventory( req, res ) {
  
    const count = await manualInventoryDb.countManualInventory( listManualInventoryFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
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


  /**************************************
   * Return routes
   * =============
   * 
   ************/
   return router;

  }