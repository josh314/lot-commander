const express = require('express');
const auth = require('../auth');

const router = new express.Router();
// Orders endpoints
router.post(
  '/list',
  auth.isAuthorized('LIST_ORDERS'),
  listPendingOrders
);
router.get(
  '/details/:orderId',
  auth.isAuthorized('VIEW_ORDER'),
  getOrder
);

module.exports = router;

const fulfillment = require('../modules/fulfillment');

async function listPendingOrders(req, res) {

  const ordersPage = await fulfillment.listPendingOrders({ 
    page: req.params.page || 1,
    pageSize: 20,
  });

  res.json(ordersPage);
}


async function getOrder(req, res, _next) {
  const orderId = req.params.orderId;
  if(orderId) {
    const order = await fulfillment.getOrder(orderId);
    res.json(order);
  }
  else {
    res.json({ error: 'No orderId submitted.' });
  }
}

