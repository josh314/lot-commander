const express = require('express');

const auth = require('../auth');
const helpers = require('../helpers');
const { InvalidRequestError } = require('../errors');

const documentSvc = require('../modules/document-svc');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 *
 *********/

const listShipmentsFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle, 'i');
  }

  if( qp.vendor ) {
    fp.vendor = new RegExp( qp.vendor, 'i');
  }

  if( 'received' in qp ) {
    fp.isReceived = !!parseInt( qp.received );
  }

  if( 'problem' in qp ) {
    fp.hasProblem = !!parseInt( qp.problem );
  }

  if( 'include_closed' in qp ) {
    fp.includeClosed = !!parseInt( qp.include_closed );
  }

  if( 'is_paid_for' in qp ) {
    fp.isPaidFor = !!parseInt( qp.is_paid_for );
  }

  if( 'is_ready_for_transportation' in qp ) {
    fp.isReadyForTransportation = !!parseInt( qp.is_ready_for_transportation );
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

  // view shipment(s) & associated data
  router.get(
    '/',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    listIncomingShipments
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    countIncomingShipments
  );
  router.get(
    '/transportation',
    auth.isAuthorized( 'VIEW_TRANSPORTATION_COST' ),
    aggregateTransportationCosts
  );
  router.get(
    '/by-handle/:shipmentHandle',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    getIncomingShipmentByHandle
  );
  router.get(
    '/:shipmentId',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    getIncomingShipmentById
  );

  // Edit/create shipment
  router.post(
    '/',
    auth.isAuthorized( 'CREATE_INCOMING_SHIPMENT' ),
    createIncomingShipment
  );
  router.patch(
    '/:shipmentId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    editIncomingShipment
  );
  router.delete(
    '/:shipmentId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    deleteIncomingShipment
  );

  // Pallet modifying operations
  router.post(
    '/:shipmentId/pallets',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    addIncomingShipmentPallet
  );
  router.delete(
    '/:shipmentId/pallets/:palletId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    removeIncomingShipmentPallet
  );
  router.patch(
    '/:shipmentId/pallets/:palletId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    editIncomingShipmentPallet
  );

  // Receiving shipments/pallets
  router.put(
    '/:shipmentId/is-received',
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    receiveIncomingShipment
  );
  router.post(
    '/:shipmentId/pallets-received',
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    receiveIncomingShipmentPallet
  );
  router.delete(
    '/:shipmentId/pallets-received/:palletId',
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    removeIncomingShipmentPalletReceived
  );

  router.put(
    '/:shipmentId/is-closed',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    closeIncomingShipment
  );

  // Consolidated pallets
  router.post(
    '/:shipmentId/pallets-consolidated',
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    addIncomingShipmentPalletConsolidated
  );
  router.delete(
    '/:shipmentId/pallets-consolidated/:palletId',
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    removeIncomingShipmentPalletConsolidated
  );



  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/

  async function listIncomingShipments( req, res ) {

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
      filterParams: listShipmentsFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: helpers.populationPathsFromQuery( req.query )
    };

    const shipments = await inventoryCommander.listIncomingShipments(query);

    res.json( { shipments } );
  }

  async function countIncomingShipments( req, res ) {

    const count = await inventoryCommander.countIncomingShipments( listShipmentsFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });

  }

  async function getIncomingShipmentById( req, res, next ) {

    try {

      const shipmentId = req.params.shipmentId;
      const populate = helpers.populationPathsFromQuery( req.query );
      const getPalletProceeds = !!parseInt( req.query.pallet_proceeds );

      const shipment = await inventoryCommander.getIncomingShipmentById( shipmentId, { populate, getPalletProceeds } );

      res.json( { shipment } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function getIncomingShipmentByHandle( req, res, next ) {

    try {

      const shipmentHandle = req.params.shipmentHandle;
      const populate = helpers.populationPathsFromQuery( req.query );

      const shipment = await inventoryCommander.getIncomingShipmentByHandle( shipmentHandle, { populate } );

      res.json( { shipment } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function createIncomingShipment( req, res, next ) {

    try {
      const data = Object.assign(
        {},
        req.body
      );

      data.palletsExpected = data.pallets;
      delete data.pallets;

      if( req.body.arrivalDate ) {
        data.arrivalDateExpected = new Date( req.body.arrivalDate );
        delete data.arrivalDate;
      }

      const shipment = await inventoryCommander.createIncomingShipment( data );

      eventsDb.createIncomingShipment( { user: req.user, shipment } );

      res.json( { shipment } );
    }
    catch(e) {

      return next( e );

    }

  }

  async function editIncomingShipment( req, res, next ) {

    try {

      const shipmentId = req.params.shipmentId;
      const editDocument = req.body;

      const { shipment, edits } = await inventoryCommander.editIncomingShipment( shipmentId, editDocument );

      if( shipment ) {

        for( let edit of edits ) {

          const eventData = Object.assign(
            {
              user: req.user,
              shipmentId,
            },
            edit
          );

          eventsDb.editIncomingShipment( eventData );

        }

      }

      res.json( { success: true } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function deleteIncomingShipment( req, res, next ) {

    try {
      const shipmentId = req.params.shipmentId;
      const deletePallets = !!parseInt( req.query.delete_pallets );

      const { shipment, pallets } = await inventoryCommander.deleteIncomingShipment( shipmentId , { deletePallets });

      if( shipment ) {
        eventsDb.deleteIncomingShipment( { user: req.user, shipmentId: shipmentId } );
      }

      if( pallets && deletePallets ) {

        for( const p of pallets ) {
          eventsDb.deleteInventoryPallet( { user: req.user, shipmentId: shipment && shipment._id, palletId: p._id } );
        }

      }

      res.json( { success: true } );
    }
    catch(e) {
      return next(e);
    }

  }

  //==========================
  // Expected Pallets modifying handlers

  async function addIncomingShipmentPallet( req, res, next ) {

    const shipmentId = req.params.shipmentId;
    const palletData = req.body;

    try {

      const { shipment, pallet } = await inventoryCommander.addIncomingShipmentExpectedPallet( shipmentId, palletData );

      if( shipment && pallet ) {

        eventsDb.addIncomingShipmentExpectedPallet( {
          user: req.user,
          shipmentId,
          palletId: pallet._id
        } );

      }

      res.json({ success: true });

    }
    catch(e) {

      return next( e );

    }

  }

  async function removeIncomingShipmentPallet( req, res, next ) {

    const shipmentId = req.params.shipmentId;
    const palletId = req.params.palletId;

    try {

      const { shipment, pallet } = await inventoryCommander.removeIncomingShipmentExpectedPallet( shipmentId, palletId );

      if( shipment && pallet ) {

        eventsDb.deleteIncomingShipmentExpectedPallet( {
          user: req.user,
          shipmentId,
          palletData: pallet
        } );

      }

      res.json({ success: true });

    }
    catch(e) {

      return next( e );

    }

  }

  async function editIncomingShipmentPallet( req, res, next ) {

    const shipmentId = req.params.shipmentId;
    const palletId = req.params.palletId;
    const editDocument = req.body;

    try {

      const { shipment, pallet, edits } = await inventoryCommander.editIncomingShipmentExpectedPallet( shipmentId, palletId, editDocument );

      if( shipment && pallet ) {

        for( let edit of edits ) {

          const eventData = Object.assign(
            {
              user: req.user,
              shipmentId,
              palletId
            },
            edit
          );

          eventsDb.editIncomingShipmentExpectedPallet( eventData );

        }

      }

      res.json( { success: true } );
    }
    catch(e) {

      return next( e );

    }

  }

  //===================
  // Receiving handlers

  async function receiveIncomingShipment( req, res, next ) {

    try {

      if( 'isReceived' in req.body && typeof req.body.isReceived === 'boolean' ) {

        const isReceived = req.body.isReceived;
        const shipmentId = req.params.shipmentId;

        if( isReceived ) {

          const { shipment } = await inventoryCommander.receiveIncomingShipment( shipmentId );

          if( shipment ) {
            eventsDb.receiveIncomingShipment( { user: req.user, shipment } );
          }

        }
        else {

          const { shipment, pallets } = await inventoryCommander.unreceiveIncomingShipment( shipmentId, { deletePallets: true } );

          if( shipment ) {
            eventsDb.unreceiveIncomingShipment( { user: req.user, shipment } );
          }

          if( pallets ) {

            for( const p of pallets ) {
              eventsDb.deleteInventoryPallet( { user: req.user, shipmentId: shipment && shipment._id, palletId: p._id } );
            }

          }

        }

        res.json( { success: true } );

      }
      else {
        throw new InvalidRequestError();
      }

    }
    catch(e) {

      return next( e );

    }

  }

  async function receiveIncomingShipmentPallet( req, res, next ) {

    try {

      const shipmentId = req.params.shipmentId;
      const palletData = req.body;

      const { shipment, palletReceived, palletExpected } = await inventoryCommander.receiveIncomingShipmentPallet( shipmentId, palletData );

      if( !palletReceived ) {
        throw new Error('Failed.');
      }

      if( shipment ) {

        eventsDb.createInventoryPallet( {
          user: req.user,
          palletId: palletReceived._id,
          shipmentId: shipment._id
        } );

      }

      if( palletExpected ) {

        const srcFolder = documentSvc.folder( 'incoming-shipment-expected-pallet' )( palletExpected._id );
        const result = await documentSvc.list( { folder: srcFolder } );

        if( result && result.documents ) {

          for( let document of result.documents ) {

            await documentSvc.clone( {
              srcFolder,
              destFolder: documentSvc.folder( 'inventory-pallet' )( palletReceived._id ),
              name: document.name
            } );

          }

        }

      }

      res.json( { success: true } );

    }
    catch(e) {

      return next(e);

    }

  }

  async function removeIncomingShipmentPalletReceived( req, res, next ) {

    try {

      const shipmentId = req.params.shipmentId;
      const palletId = req.params.palletId;

      const { shipment, pallet } = await inventoryCommander.deleteIncomingShipmentPalletReceived( shipmentId, palletId );


      if( shipment && pallet ) {

        eventsDb.deleteInventoryPallet( {
          user: req.user,
          palletId: pallet._id,
          shipmentId: shipment._id
        } );

      }

      res.json( { success: true } );
    }
    catch(e) {
      return next(e);
    }
  }

  // Consolidated pallets

  async function addIncomingShipmentPalletConsolidated( req, res, next ) {

    try {

      const shipmentId = req.params.shipmentId;
      const palletData = req.body;

      const { shipment, pallet } = await inventoryCommander.addIncomingShipmentPalletConsolidated( shipmentId, palletData );

      if( shipment && pallet ) {

        eventsDb.createInventoryPallet( {
          user: req.user,
          palletId: pallet._id,
          shipmentId: shipment._id
        } );

      }

      res.json( { success: true } );
    }
    catch(e) {
      return next(e);
    }

  }

  async function removeIncomingShipmentPalletConsolidated( req, res, next ) {

    try {

      const shipmentId = req.params.shipmentId;
      const palletId = req.params.palletId;

      const { shipment, pallet } = await inventoryCommander.deleteIncomingShipmentPalletConsolidated( shipmentId, palletId );


      if( shipment && pallet ) {

        eventsDb.deleteInventoryPallet( {
          user: req.user,
          palletId: pallet._id,
          shipmentId: shipment._id
        } );

      }

      res.json( { success: true } );
    }
    catch(e) {
      return next(e);
    }
  }

  //===========================
  // Close shipment handler

  async function closeIncomingShipment( req, res, next ) {

    try {

      if( 'isClosed' in req.body && typeof req.body.isClosed === 'boolean' ) {

        const isClosed = req.body.isClosed;
        const shipmentId = req.params.shipmentId;

        if( isClosed ) {

          const { shipment } = await inventoryCommander.closeIncomingShipment( shipmentId );

          eventsDb.closeIncomingShipment( { user: req.user, shipment } );

        }
        else {

          const { shipment } = await inventoryCommander.reopenIncomingShipment( shipmentId );

          eventsDb.reopenIncomingShipment( { user: req.user, shipment } );

        }

        res.json( { success: true } );

      }
      else {
        throw new InvalidRequestError();
      }

    }
    catch(e) {

      return next(e);

    }

  }

  async function aggregateTransportationCosts( req, res, next ) {

    try {


      const options = {};

      if( req.query.start_date ) {
        options.startDate = req.query.start_date;
      }

      if( req.query.end_date ) {
        options.endDate = req.query.end_date;
      }

      if( req.query.period ) {
        options.period = req.query.period;
      }

      const { costs } = await inventoryCommander.aggregateTransportationCosts( options );


      res.json( { costs } );

    }
    catch(e) {

      return next(e);

    }

  }

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}


