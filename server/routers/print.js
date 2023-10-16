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


  router.get('/labels/lots/:lotId/shipping-items', lotShippingItemsLabels);
  router.get( '/labels/pallets/:palletId/shipping-items', palletShippingItemsLabels );
  router.get( '/labels/pallets/:palletId/split-groups/:splitGroupId', palletSplitGroupLabels );

  router.post('/labels/packages/', packageLabelsByIdList);

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

  async function packageLabelsByIdList( req, res, next ) {

    try {

      const { packageIds } = req.body;

      const packages = await inventoryCommander.getPackagesById( packageIds, { populate: [ 'shipment' ] } );

      print.createPackageLabels( packages ).pipe(res);

    }
    catch(e) {
      next(e);
    }
  }

  function palletShippingItemsLabels(req, res, next) {
    const palletId = req.params.palletId;

    inventoryCommander.getInventoryPalletById( palletId, { populate: [ 'shipment' ] } )
      .then( pallet => {

        if( !pallet ) {

          throw new Error(`No pallet found with id ${palletId}`);

        }

        print.createPalletShippingItemsLabels( pallet ).pipe(res);

      })
      .catch( next );
  }

  function palletSplitGroupLabels(req, res, next) {
    const palletId = req.params.palletId;
    const splitGroupId = req.params.splitGroupId;

    inventoryCommander.getInventoryPalletById( palletId, { populate: [ 'shipment' ] } )
      .then( pallet => {

        if( !pallet ) {

          throw new Error(`No pallet found with id ${palletId}`);

        }

        const splitGroup = pallet.splitGroups.id( splitGroupId );

        if( splitGroup ) {

          print.createPalletSplitGroupLabels( splitGroup, pallet ).pipe(res);

        }
        else {

          throw new Error(`No splitGroup found with id ${splitGroupId} in pallet ${palletId}.`);

        }
      })
      .catch( next );
  }

  function lotShippingItemsLabels(req, res, next) {
    const lotId = req.params.lotId;

    lotdb.getLotById( lotId, { populate: [ 'pallet', 'pallet.shipment' ] } )
      .then( lot => {

        if( !lot ) {

          throw new Error(`No lot found with id ${lotId}`);

        }

        print.createLotShippingItemsLabels( lot ).pipe(res);

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