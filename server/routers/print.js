const path = require('path');
const express = require('express');

const print = require(path.join(__basedir, __config.modulesPath, 'print'));

module.exports = routes;


/**********************************************
 * helpers
 * =======
 * 
 **********/

function getPalletList( shipment, type ) {

  let pallets;

  if( type === 'expected' ) {
    pallets = shipment.palletsExpected;
  }
  else if( type === 'consolidated' ) {
    pallets = shipment.palletsConsolidated;
  }
  else {
    pallets = shipment.palletsReceived;
  }

  return pallets;
}


/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ inventoryCommander, lotdb }) {

  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get('/labels/lots/:lotId', lotLabels);
  router.get('/labels/incoming-shipments/:shipmentId/pallets-:palletList', incomingShipmentLabels);
  router.get('/labels/incoming-shipments/:shipmentId/pallets-:palletList/:palletId', incomingShipmentPalletLabel);


  /*******************************************
   * Define handlers
   * ===============
   * 
   ****/

  function lotLabels(req, res, next) {
    const lotId = req.params.lotId;
    lotdb.getLotById(lotId)
      .then(lot=>{
        if(lot) {
          print.createLotLabels(lot).pipe(res);
        }
        else {
          throw new Error(`No lot found with id ${lotId}`);
        }
      })
      .catch( next );
  }

  function incomingShipmentLabels(req, res, next) {
    const shipmentId = req.params.shipmentId;

    inventoryCommander.getIncomingShipmentById( shipmentId, { populate: [ 'palletsExpected', 'palletsReceived', 'palletsConsolidated' ] } )
      .then( shipment => {

        if(shipment) {

          const pallets = getPalletList( shipment, req.params.palletList );

          print.createPalletLabels( pallets.map( p => p.handle ), shipment.handle ).pipe(res);

        }
        else {

          throw new Error(`No shipment found with id ${shipmentId}`);

        }
      })
      .catch( next );
  }

  function incomingShipmentPalletLabel(req, res, next) {
    const shipmentId = req.params.shipmentId;
    const palletId = req.params.palletId;

    inventoryCommander.getIncomingShipmentById( shipmentId )
      .then( shipment => {

        if( !shipment ) {

          throw new Error(`No shipment found with id ${shipmentId}`);

        }

        const pallets = getPalletList( shipment, req.params.palletList );

        const pallet = pallets.id( palletId );

        if( pallet ) {

          print.createPalletLabels( [ pallet.handle ], shipment.handle ).pipe(res);

        }
        else {

          throw new Error(`No pallet found with id ${palletId} in shipment ${shipmentId}.`);

        }
      })
      .catch( next );
  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}