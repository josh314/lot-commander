const express = require('express');
const helpers = require('../helpers');

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes( eventsDb ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  // view event(s)
  router.get(
    '/shipment/:shipmentId',
    getIncomingShipmentEvents
  );

  async function getIncomingShipmentEvents( req, res ) {

    const numPage = parseInt( req.query.num ) || 10;
    const page = parseInt( req.query.page ) || 1;
  
    const options = {

      // paging
      skip: ( page - 1 ) * numPage,
      num: numPage,

      // filters
      eventType: req.query.type,

      // populate options
      populate: helpers.populationPathsFromQuery( req.query ),

    };

    const eventDocuments = await eventsDb.listIncomingShipmentEventsByShipmentId( req.params.shipmentId , options );

    const events = eventDocuments.map( _ => Object.assign( {}, _._doc , { user: _.user && _.user.getPublicInfo ? _.user.getPublicInfo() : _.user })  );

    res.json( { events } );
    
  }

  return router;
}