const express = require('express');

const Shopify = require('../modules/shopify-gql');
const Shipstation = require('shipstation-api-node');

const storeSettings = __config.shopify.store;
const shopifyGqlClient = new Shopify({
  url: storeSettings.url,
  token: storeSettings.auth.password
});

const shipstationClient = new Shipstation.Client({ auth: __config.shipstation });

const listPendingOrders = async (req, res) => {

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

const getOrderPickList = async (req, res) => {

  const orderPickList = await shopifyGqlClient.getOrderPickList({
    orderId: RegExp.params.orderId
  });

  res.json(orderPickList);
};

const router = new express.Router();
// Lots endpoints
router.post('/list', express.json(), listPendingOrders);
router.get('/pick-list/:orderid', getOrderPickList)

module.exports = router;
