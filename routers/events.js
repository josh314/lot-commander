const express = require('express');

module.exports = routes;


/**********************************************
 * Helpers
 * =======
 * 
 *********/

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
      populate: populationPaths( req.query ),

    };

    const events = await eventsDb.listIncomingShipmentEventsByShipmentId( req.params.shipmentId , options );

    res.json( { events } );
    
  }

  return router;
}