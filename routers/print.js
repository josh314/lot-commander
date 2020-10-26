const path = require('path');
const express = require('express');

const moment = require('moment');
const Promise = require('bluebird');

const print = require(path.join(__basedir, __config.modulesPath, 'print'));
const fulfillment = require('../modules/fulfillment');


module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ inventoryDb, lotdb }) {

  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get('/labels/lots/:lotId', lotLabels);
  router.get('/labels/incoming-shipments/:shipmentId/pallets-:palletList', incomingShipmentLabels);
  router.get('/labels/incoming-shipments/:shipmentId/pallets-:palletList/:palletId', incomingShipmentPalletLabel);
  router.get('/pick-receipt/:orderId', pickReceipt);


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

    inventoryDb.getIncomingShipmentById( shipmentId )
      .then( shipment => {

        if(shipment) {

          const pallets = req.params.palletList === 'expected' ? shipment.palletsExpected : shipment.palletsReceived;

          print.createBarcodeLabels( pallets.map( p => p.handle ) ).pipe(res);

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

    inventoryDb.getIncomingShipmentById( shipmentId )
      .then( shipment => {

        if( !shipment ) {

          throw new Error(`No shipment found with id ${shipmentId}`);

        }

        const pallets = req.params.palletList === 'expected' ? shipment.palletsExpected : shipment.palletsReceived;

        const pallet = pallets.id( palletId );

        if( pallet ) {

          print.createBarcodeLabels( [ pallet.handle ] ).pipe(res);

        }
        else {

          throw new Error(`No pallet found with id ${palletId} in shipment ${shipmentId}.`);

        }
      })
      .catch( next );
  }

  const getPickItemFromOrderItem = async (orderItem) => {
    if(orderItem.lineItemKey === 'discount' ) {
      return null;
    }
    else if(orderItem.sku) {
      const lot = await lotdb.getLotByHandle( orderItem.sku );
      return {
        sku: lot.handle,
        title: lot.listingData.title,
        numBoxes: lot.numBoxes,
        shippingItems: lot.shippingItems
      };
    }
    else {
      return {
        title: orderItem.name
      };
    }
  }

  async function pickReceipt(req, res, next) {
    const orderId = req.params.orderId;
    try {
      const order = await fulfillment.getOrder(orderId);

      const pickItems = ( await Promise.map( order.items, getPickItemFromOrderItem ) ).filter( _ => _ !== null );

      const orderPicklist = {
        orderNumber: order.orderNumber,
        orderDate: order.orderDate ? moment(order.orderDate).format(`MMM D, YYYY`) : null,
        pickDate: moment().format(`MMM D, YYYY`),
        items: pickItems,
      };

      print.createPickReceipt(orderPicklist).pipe(res);
    }
    catch(e) {
      next(e);
    }
  }


  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}