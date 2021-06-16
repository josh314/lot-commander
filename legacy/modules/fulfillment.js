
module.exports = {
  listPendingOrders: listPendingOrders,
  getOrder: getOrder,
};


const Shipstation = require('shipstation-api-node');
const shipstationClient = new Shipstation.Client({ auth: __config.shipstation });

async function listPendingOrders(page, pageSize) {

  const shipstationListOrdersQuery = {
    orderStatus: 'awaiting_shipment', // or 'pending_fulfillment'?
    sortBy: 'CreateDate',
    sortDir: 'DESC', // 'ASC'/'DESC'
    page: page,
    pageSize: pageSize,
  };

  const ordersPage = await shipstationClient.listOrders({
    query: shipstationListOrdersQuery
  });

  //TODO: strip down data to ease network traffic

  return ordersPage;
}


async function getOrder(orderId) {
  if(orderId) {
    const order = await shipstationClient.getOrder(orderId);

    return order;
  }
  else {
    throw new Error( 'No orderId submitted.' );
  }
}

