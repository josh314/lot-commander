const path = require('path');
const express = require('express');

const moment = require('moment');
const Promise = require('bluebird');

const print = require(path.join(__basedir, __config.modulesPath, 'print'));
const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const fulfillment = require('../modules/fulfillment');

const router = new express.Router();

//endpoints
router.get('/labels/:lotId', labels);
router.get('/pick-receipt/:orderId', pickReceipt);

function labels(req, res, next) {
  const lotId = req.params.lotId;
  lotdb.getLotById(lotId)
    .then(lot=>{
      if(lot) {
        print.createLabels(lot).pipe(res);
      }
      else {
        throw new Error(`No lot found with id ${lotId}`);
      }
    })
    .catch(e=>{
      next(e)
    });
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

module.exports = router;