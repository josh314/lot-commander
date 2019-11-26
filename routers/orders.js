const express = require('express');

const router = new express.Router();
// Orders endpoints
router.post('/list', listPendingOrders);
router.get('/details/:orderId', getOrder)

module.exports = router;

const Shipstation = require('shipstation-api-node');
const shipstationClient = new Shipstation.Client({ auth: __config.shipstation });

async function listPendingOrders(req, res) {

  const shipstationListOrdersQuery = {
    orderStatus: 'awaiting_shipment', // or 'pending_fulfillment'?
    sortBy: 'CreateDate',
    sortDir: 'DESC', // 'ASC'/'DESC'
    page: req.params.page || 1,
    pageSize: 20,
  };

  const ordersPage = await shipstationClient.listOrders({
    query: shipstationListOrdersQuery
  });

  //TODO: strip down data to ease network traffic

  res.json(ordersPage);
}


async function getOrder(req, res, next) {
  const orderId = req.params.orderId;
  if(orderId) {
    const order = await shipstationClient.getOrder(orderId)

    res.json(order);
  }
  else {
    res.json({ error: 'No orderId submitted.' });
  }
}

