const express = require('express');

const auth = require('../auth');
const flashMessages = require('../modules/flash-messages');

module.exports = routes;

function routes({ inventoryDb }) {
  const router = new express.Router();

  /*******************************************
   * Routes
   * ======
   * 
   ****/

  router.get(
    '/incoming', 
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    listIncomingShipments
  );
  router.get(
    '/incoming/count', 
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    countIncomingShipments
  );
  router.post(
    '/incoming/create',
    auth.isAuthorized( 'CREATE_INCOMING_SHIPMENT' ),
    createIncomingShipment
  );
  router.get(
    '/incoming/:shipmentId', 
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    getIncomingShipmentById
  );

  /*******************************************
   * Handlers
   * ========
   * 
   ****/

  async function listIncomingShipments( req, res ) {

    const numPage = parseInt( req.query.num ) || 10;
    const page = parseInt( req.query.page ) || 1;
  
    const query = {
      skip: ( page - 1 ) * numPage,
      num: numPage,
      sort: req.query.sort,
      sortDir: parseInt(req.query.sort_dir),
    };

    if( req.query.received ) {
      query.isReceived = !!parseInt( req.query.received );
    }

    const shipments = await inventoryDb.listIncomingShipments(query);

    res.json( { shipments } );
  };

  async function countIncomingShipments( req, res ) {
  
    const query = {};
  
    if( req.query.received ) {
      query.isReceived = !!parseInt( req.query.received );
    }

    const count = await inventoryDb.countIncomingShipments( query );

    res.json({ count: count });
    
  }

  async function createIncomingShipment( req, res ) {

    const data = {
      handle: req.body.handle,
      vendor: req.body.vendor,
      carrier: req.body.carrier,
      arrivalDateExpected: new Date( req.body.arrivalDate ),
      pallets: req.body.pallets || []
    };

    const shipment = await inventoryDb.createIncomingShipment( data );

    res.json({ shipment });

  }

  async function getIncomingShipmentById( req, res ) {

    const shipment = await inventoryDb.getIncomingShipmentById( req.params.shipmentId );
    if( shipment ) {
      res.json( { shipment } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }
  };

  return router;

}


