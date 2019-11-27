const path = require('path');
const express = require('express');

const print = require(path.join(__basedir, __config.modulesPath, 'print'));
const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));

const router = new express.Router();

//endpoints
router.get('/labels/:lotId', labels);
router.get('/pick-receipt/:orderNumber', pickReceipt);

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

function pickReceipt(req, res, next) {
  const orderNumber = req.params.orderNumber;
  try {
    print.createPickReceipt(orderNumber).pipe(res);
  }
  catch(e) {
    next(e);
  }
}

module.exports = router;