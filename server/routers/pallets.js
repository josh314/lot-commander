const express = require('express');

const auth = require('../auth');
const helpers = require('../helpers');
const { InvalidRequestError } = require('../errors');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 * 
 *********/

const listPalletsFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle, 'i');
  }

  if( qp.shipment ) {
    fp.shipment = qp.shipment;
  }

  if( qp.has_problem ) {
    fp.hasProblem = !!parseInt(qp.has_problem);
  }

  if( qp.is_received ) {
    fp.isReceived = !!parseInt(qp.is_received);
  }

  if( qp.is_brokendown ) {
    fp.isBrokendown = !!parseInt(qp.is_brokendown);
  }

  if( qp.is_anonymous ) {
    fp.isAnonymous = !!parseInt(qp.is_anonymous);
  }

  if( qp.category ) {
    fp.category = qp.category;
  }

  // TODO: category
  return fp;
};


/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ eventsDb, inventoryCommander }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  // view pallet(s)
  router.get(
    '/',
    auth.isAuthorized( 'VIEW_INVENTORY_PALLET' ),
    resolveShipmentIds,
    listInventoryPallets
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_INVENTORY_PALLET' ),
    resolveShipmentIds,
    countInventoryPallets
  );
  router.get(
    '/:palletId',
    auth.isAuthorized( 'VIEW_INVENTORY_PALLET' ),
    getInventoryPalletById
  );

  // Edit/create pallet
  router.post(
    '/',
    auth.isAuthorized( 'CREATE_INVENTORY_PALLET' ),
    createInventoryPallets
  );
  router.patch(
    '/:palletId',
    auth.isAuthorized( 'EDIT_INVENTORY_PALLET' ),
    editInventoryPallet
  );
  router.put(
    '/:palletId/is-brokendown',
    auth.isAuthorized( 'EDIT_INVENTORY_PALLET' ),
    breakdownInventoryPallet
  );
  router.delete(
    '/:palletId',
    auth.isAuthorized( 'EDIT_INVENTORY_PALLET' ),
    deleteInventoryPallet
  );


  /*******************************************
   * Define Handlers & Middleware 
   * ===============
   * 
   ****/

  async function resolveShipmentIds( req, _res, next ) {

    try {

      if( req.query.shipment_handle ) {

        const filterParams = { handle: new RegExp( req.query.shipment_handle, 'i'), includeClosed: true };

        const shipments = await inventoryCommander.listIncomingShipments( { filterParams } );

        req.query.shipment = shipments.map( s => s._id );

      }

      next();

    }
    catch (e) {
      next( e );
    }

  }

  async function listInventoryPallets( req, res ) {

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
      filterParams: listPalletsFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: helpers.populationPathsFromQuery( req.query )
    };

    const pallets = await inventoryCommander.listInventoryPallets( query );

    res.json( { pallets } );
  }

  async function countInventoryPallets( req, res ) {
  
    const count = await inventoryCommander.countInventoryPallets( listPalletsFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
  }

  async function createInventoryPallets( req, res, next  ) {

    try {
      
      const { pallets } = await inventoryCommander.createInventoryPallets( req.body.pallets );

      if( pallets ) {

        for( let pallet of pallets ) {
          eventsDb.createInventoryPallet( { user: req.user, palletId: pallet._id } );
        }
        
      }

      res.json( { pallets } );
    }
    catch(e) {

      return next( e );

    }

  }

  async function getInventoryPalletById( req, res, next ) {

    try {

      const palletId = req.params.palletId;
      const populate = helpers.populationPathsFromQuery( req.query );

      const pallet = await inventoryCommander.getInventoryPalletById( palletId, { populate } );

      res.json( { pallet } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function deleteInventoryPallet( req, res, next ) {

    try {

      const palletId = req.params.palletId;
      const _pallet = await inventoryCommander.getInventoryPalletById( palletId );

      let $promise;
      if( _pallet.shipment ) {

        $promise = _pallet.isReceived ?
          inventoryCommander.deleteIncomingShipmentPalletReceived( _pallet.shipment, palletId ) :
          inventoryCommander.deleteIncomingShipmentPalletConsolidated( _pallet.shipment, palletId );

      }
      else {

        $promise = inventoryCommander.deleteInventoryPallet( palletId );

      }

      const { pallet } = await $promise;

      if( pallet ) {
        eventsDb.deleteInventoryPallet( { user: req.user, palletId: pallet._id } );
      }

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function editInventoryPallet( req, res, next ){

    try {

      const palletId = req.params.palletId;
      const editDocument = req.body;

      const { pallet, edits } = await inventoryCommander.editInventoryPallet( palletId, editDocument );

      if( pallet ) {

        for( let edit of edits ) {

          const eventData = Object.assign(
            {
              user: req.user,
              palletId: pallet._id,
            },
            edit
          );

          eventsDb.editInventoryPallet( eventData );

        }

      }

      res.json( { success: true } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function breakdownInventoryPallet( req, res, next ){

    try {

      if( 'isBrokendown' in req.body && typeof req.body.isBrokendown === 'boolean' ) {

        const isBrokendown = req.body.isBrokendown;
        const palletId = req.params.palletId;
  
        const fn = isBrokendown ? inventoryCommander.breakdownInventoryPallet.bind( inventoryCommander ) : inventoryCommander.unbreakdownInventoryPallet.bind( inventoryCommander );

        const { pallet } = await fn( palletId );

        if( pallet ) {

          isBrokendown ? eventsDb.breakdownInventoryPallet( { user: req.user, palletId } ) : eventsDb.unbreakdownInventoryPallet( { user: req.user, palletId } );

        }


        res.json( { success: true, pallet } );

      }
      else {
        throw new InvalidRequestError();
      }

    }
    catch(e) {
      return next( e );
    }

  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}