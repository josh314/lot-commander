const express = require('express');

const router = new express.Router();
// Orders endpoints
router.post('/list', listPendingOrders);
router.get('/details/:orderId', getOrder)

module.exports = router;

const orders = require('../modules/orders');

async function listPendingOrders(req, res) {

  const ordersPage = await orders.listPendingOrders({ 
    page: req.params.page || 1,
    pageSize: 20,
  });

  res.json(ordersPage);
}


async function getOrder(req, res, next) {
  const orderId = req.params.orderId;
  if(orderId) {
    const order = await orders.getOrder(orderId)
    res.json(order);
  }
  else {
    res.json({ error: 'No orderId submitted.' });
  }
}

