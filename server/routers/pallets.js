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
    auth.isAuthorized( 'VIEW_RECEIVED_PALLET' ),
    resolveShipmentIds,
    listReceivedPallets
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_RECEIVED_PALLET' ),
    resolveShipmentIds,
    countReceivedPallets
  );
  router.get(
    '/:palletId',
    auth.isAuthorized( 'VIEW_RECEIVED_PALLET' ),
    getReceivedPalletById
  );

  // Edit/create pallet
  router.post(
    '/',
    auth.isAuthorized( 'CREATE_RECEIVED_PALLET' ),
    createReceivedPallets
  );
  router.patch(
    '/:palletId',
    auth.isAuthorized( 'EDIT_RECEIVED_PALLET' ),
    editReceivedPallet
  );
  router.put(
    '/:palletId/is-brokendown',
    auth.isAuthorized( 'EDIT_RECEIVED_PALLET' ),
    breakdownReceivedPallet
  );
  router.delete(
    '/:palletId',
    auth.isAuthorized( 'EDIT_RECEIVED_PALLET' ),
    deleteReceivedPallet
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

  async function listReceivedPallets( req, res ) {

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

    const pallets = await inventoryCommander.listReceivedPallets( query );

    res.json( { pallets } );
  }

  async function countReceivedPallets( req, res ) {
  
    const count = await inventoryCommander.countReceivedPallets( listPalletsFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
  }

  async function createReceivedPallets( req, res, next  ) {

    try {
      
      const { pallets } = await inventoryCommander.createReceivedPallets( req.body.pallets );

      if( pallets ) {

        for( let pallet of pallets ) {
          eventsDb.createReceivedPallet( { user: req.user, palletId: pallet._id } );
        }
        
      }

      res.json( { pallets } );
    }
    catch(e) {

      return next( e );

    }

  }

  async function getReceivedPalletById( req, res, next ) {

    try {

      const palletId = req.params.palletId;
      const populate = helpers.populationPathsFromQuery( req.query );

      const pallet = await inventoryCommander.getReceivedPalletById( palletId, { populate } );

      res.json( { pallet } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function deleteReceivedPallet( req, res, next ) {

    try {

      const palletId = req.params.palletId;

      const { pallet } = await inventoryCommander.deleteReceivedPallet( palletId );

      if( pallet ) {
        eventsDb.deleteReceivedPallet( { user: req.user, palletId: pallet._id } );
      }

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function editReceivedPallet( req, res, next ){

    try {

      const palletId = req.params.palletId;
      const editDocument = req.body;

      const { pallet, edits } = await inventoryCommander.editReceivedPallet( palletId, editDocument );

      if( pallet ) {

        for( let edit of edits ) {

          const eventData = Object.assign(
            {
              user: req.user,
              palletId: pallet._id,
            },
            edit
          );

          eventsDb.editReceivedPallet( eventData );

        }

      }

      res.json( { success: true } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function breakdownReceivedPallet( req, res, next ){

    try {

      if( 'isBrokendown' in req.body && typeof req.body.isBrokendown === 'boolean' ) {

        const isBrokendown = req.body.isBrokendown;
        const palletId = req.params.palletId;
  
        const fn = isBrokendown ? inventoryCommander.breakdownReceivedPallet.bind( inventoryCommander ) : inventoryCommander.unbreakdownReceivedPallet.bind( inventoryCommander );

        const { pallet } = await fn( palletId );

        if( pallet ) {

          isBrokendown ? eventsDb.breakdownReceivedPallet( { user: req.user, palletId } ) : eventsDb.unbreakdownReceivedPallet( { user: req.user, palletId } );

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