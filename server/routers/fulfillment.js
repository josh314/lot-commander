const express = require('express');

const auth = require('../auth');
const helpers = require('../helpers');
const { InvalidRequestError } = require('../errors');
const { createSnapshot } = require('copy-webpack-plugin');
const { create } = require('express-handlebars');

module.exports = routes;


/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes({ fulfillmentCommander }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  // view shipment(s) & associated data
  // router.get(
  //   '/',
  //   auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
  //   listIncomingShipments
  // );
  router.get(
    '/shipments/:shipmentId',
    // auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    getShipment
  );
  router.post(
    '/create-shipment',
    // auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    createShipment
  );


  async function getShipment( req, res, next ) {
    const { shipmentId } = req.params;

    try {
      const shipment = await fulfillmentCommander.getShipment( shipmentId );

      res.json( shipment );
    } catch( err ) {
      next( err );
    }
  }

  async function createShipment( req, res, next ) {
    const { orderPickId } = req.body;

    try {
      const { shipment } = await fulfillmentCommander.createShipment( orderPickId );

      res.json( shipment );
    } catch( err ) {
      next( err );
    }
  }

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}