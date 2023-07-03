const path = require('path');
const express = require('express');

const auth = require('../auth');

const quickLots = require(path.join(__basedir, __config.modulesPath, 'quick-lots'));
const bstockDb = require(path.join(__basedir, __config.modulesPath, 'bstock-db'));

// middleware to stick for testing purposes
// function testLog(s) {
//   return function testLog(req, res, next) {
//     console.log(s);
//     next();
//   };
// }

//routes
function routes({
  bstock,
  countCommander,
  eventsDbClient,
  inventoryCommander,
  listings,
  lotdb,
  manifests,
  manualInventoryDbClient,
  productData,
  shopifyGql,
  shopifyOrders,
  storeMetafieldSchemaDb,
  userDbClient
}) {

  const router = new express.Router();

  router.use('/api/users', require('./users')( { users: userDbClient } ) );

  // lots api
  router.use('/api/lots', require( './lots' )( { inventoryCommander, lotdb } ) );

  // bstock db api
  router.post('/api/bstock-db/auctions/get', auth.isAuthorized('LIST_AUCTIONS'), express.json(), bstockDb.getAuctions);

  // product data
  router.use('/api/product-data', require('./product-data')( { productData } ) );

  // import & register routers

  router.use('/api/listings', require('./listings')( { eventsDb: eventsDbClient, inventoryCommander, listings, lotdb, shopifyGql } ));
  router.use('/api/image', require('./images')( { lotdb } ) );
  router.use('/api/print', require('./print')( { inventoryCommander, lotdb: lotdb } ) );
  router.use('/api/manifests', require('./manifests')( { manifests } ) );

  router.use('/api/content', require('./content')( { shopifyGql, storeMetafieldSchemaDb } ) );


  // inventory commander
  router.use('/api/inventory', require('./inventory')( { inventoryCommander } ) );
  router.use('/api/receiving', require('./receiving')( { eventsDb: eventsDbClient, inventoryCommander } ) );
  router.use('/api/pallets', require('./pallets')( { eventsDb: eventsDbClient, inventoryCommander } ) );
  router.use('/api/packages', require('./packages')( { eventsDb: eventsDbClient, inventoryCommander } ) );
  router.use('/api/bundles', require('./bundles')( { eventsDb: eventsDbClient, inventoryCommander } ) );
  router.use(
    '/api/events',
    // auth.isAuthorized('VIEW_EVENTS'),
    require('./events')( eventsDbClient )
  );
  router.use('/api/manual-inventory', require('./manual-inventory')( { manualInventoryDb: manualInventoryDbClient } ) );
  router.use('/api/documents', require('./documents')( ) );

  // shopify orders
  router.use('/api/orders', require('./orders')( { shopifyOrders } ) );

  // counter app
  router.use('/api/counters', require('./counters')( { countCommander } ) );

  // dynamically created JS scripts for the client
  router.use('/build', require('./script-builder')( { bstock, listings, lotdb, quickLots }) );

  router.use( express.static(path.join(__basedir, __config.assets.root)) );
  router.use( express.static(path.join(__basedir, __config.imgPath)) );

  //default route. the front-end rendering will all hit this.
  router.get('*',
    (req,res) => res.render('main.hbs', {
      title: "Lot Commander",
      description: "App for creating and managing product lots and associated manifests.",
    })
  );

  return router;
}

module.exports = routes;