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

  if( qp.lotNumber ) {
    fp.lotNumber = parseInt( qp.lotNumber );
  }

  if( qp.shipment ) {
    fp.shipment = qp.shipment;
  }

  if( qp.has_problem ) {
    fp.hasProblem = !!parseInt(qp.has_problem);
  }

  if( qp.is_missing ) {
    fp.isMissing = !!parseInt(qp.is_missing);
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

  if( qp.condition ) {
    fp.condition = qp.condition;
  }

  if( qp.to_be_listed ) {
    fp.toBeListed = !!parseInt(qp.to_be_listed);
  }

  if( qp.to_be_processed ) {
    fp.toBeProcessed = !!parseInt(qp.to_be_processed);
  }

  if( qp.is_allocated_for_unmanifested_lots ) {
    fp.isAllocatedForUnmanifestedLots = !!parseInt(qp.is_allocated_for_unmanifested_lots);
  }

  if( qp.is_repacked ) {
    fp.isRepacked = !!parseInt(qp.is_repacked);
  }

  if( qp.has_lot ) {
    fp.hasLot = !!parseInt(qp.has_lot);
  }

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
    setListAuthFromQueryParam,
    resolveShipmentIds,
    listInventoryPallets
  );
  router.get(
    '/count',
    setListAuthFromQueryParam,
    resolveShipmentIds,
    countInventoryPallets
  );
  router.get(
    '/aggregate',
    auth.isAuthorized( 'VIEW_INVENTORY_PALLET' ),
    resolveShipmentIds,
    aggregateInventoryPallets
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
    auth.isAuthorizedForAny( 'EDIT_INVENTORY_PALLET', 'REPACK_INVENTORY_PALLET', 'SPLIT_INVENTORY_PALLET' ),
    setEditDocumentBasedUponAuth,
    editInventoryPallet
  );
  router.post(
    '/:palletId/images/',
    auth.isAuthorizedForAny( 'EDIT_INVENTORY_PALLET', 'REPACK_INVENTORY_PALLET', 'SPLIT_INVENTORY_PALLET' ),
    setEditDocumentBasedUponAuth,
    addInventoryPalletImages,
  );
  router.put(
    '/:palletId/is-brokendown',
    auth.isAuthorized( 'EDIT_INVENTORY_PALLET' ),
    breakdownInventoryPallet
  );
  router.put(
    '/:palletId/is-repacked',
    auth.isAuthorizedForAny(
      'EDIT_INVENTORY_PALLET',
      'REPACK_INVENTORY_PALLET'
    ),
    repackInventoryPallet
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

  function setListAuthFromQueryParam( req, res, next ) {
    if( req.query.to_be_listed ) {
      return auth.isAuthorizedForAny( 'LIST_INVENTORY_PALLETS', 'LIST_INVENTORY_PALLETS_TO_BE_LISTED' )( req, res, next );
    }
    else if( req.query.to_be_processed || req.query.is_allocated_for_unmanifested_lots ) {
      return auth.isAuthorizedForAny( 'LIST_INVENTORY_PALLETS', 'LIST_INVENTORY_PALLETS_TO_BE_PROCESSED' )( req, res, next );
    }
    else {
      return auth.isAuthorized( 'LIST_INVENTORY_PALLETS' )( req, res, next );
    }
  }

  function setEditDocumentBasedUponAuth( req, _res, next ) {

    if( !req.user || req.user.isAuthorized( 'EDIT_INVENTORY_PALLET' ) ) {
      return next();
    }

    const allowedEditFields = {
      REPACK_INVENTORY_PALLET: [
        'category',
        'units',
        'removedItems',
        'splitGroups',
        'retailValue',
        'salePrice',
      ],
    };

    const _editDocument = {};
    for( let _permission of Object.keys( allowedEditFields ) ) {

      if( req.user.isAuthorized( _permission ) ) {

        for( let _editField of allowedEditFields[ _permission ] ) {
          _editDocument[ _editField ] = req.body[ _editField ];
        }

      }
    }
    req.body = _editDocument;

    next();
  }

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

  async function aggregateInventoryPallets( req, res, _next ) {

    const options = {};

    if( req.query.date ) {
      options.date = new Date( req.query.date );
    }

    const inventory = await inventoryCommander.aggregateInventoryPallets( options );

    res.json( { pallets: inventory } );
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

      res.json( { pallet } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function addInventoryPalletImages( req, res, next ){

    try {

      const palletId = req.params.palletId;
      const { images } = req.body;

      const pallet = await inventoryCommander.addInventoryPalletImages( palletId, images );


      res.json( { pallet } );

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

  async function repackInventoryPallet( req, res, next ){

    try {

      if( 'isRepacked' in req.body && typeof req.body.isRepacked === 'boolean' ) {

        const isRepacked = req.body.isRepacked;
        const palletId = req.params.palletId;

        const fn = isRepacked ? inventoryCommander.repackInventoryPallet.bind( inventoryCommander ) : inventoryCommander.unrepackInventoryPallet.bind( inventoryCommander );

        const { pallet } = await fn( palletId );

        if( pallet ) {

          isRepacked ? eventsDb.repackInventoryPallet( { user: req.user, palletId } ) : eventsDb.unrepackInventoryPallet( { user: req.user, palletId } );

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