const path = require('path');
const express = require('express');

const auth = require('../auth');

const scriptBuilder = require(path.join(__basedir, __config.modulesPath, 'script-builder'));

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const bstockDb = require(path.join(__basedir, __config.modulesPath, 'bstock-db'));
const listings = require(path.join(__basedir, __config.modulesPath, 'listings'));
const productData = require(path.join(__basedir, __config.modulesPath, 'product-data'));

// middleware to stick for testing purposes
// function testLog(s) {
//   return function testLog(req, res, next) {
//     console.log(s);
//     next();
//   };
// }

//routes
function routes({ eventsDbClient, inventoryCommander, shopifyDumpDb, userDbClient, manualInventoryDbClient, shopifyGql }) {

  const router = new express.Router();

  // =====================================
  // USERS SECTION =======================
  // =====================================
  router.use('/api/users', require('./users')( { users: userDbClient } ) );
  // we will want this protected so you have to be logged in to visit
  // we will use route middleware to verify this (the isLoggedIn function)
  // router.get('/api/users/all', users.api.isManager, users.api.getAllUsers);
  // router.post('/api/users/new', users.api.canCreateNewUsers, users.api.createUser);
  // router.post('/api/users/change-password', auth.isLoggedIn, users.api.changeUserPassword);
  // router.get('/api/users/get/:username', users.api.isLoggedIn , users.api.getUserInfo );
  // router.post('/api/users/edit-role', users.api.isManager, users.api.editUserRole);

  // lot database api
  router.post('/api/db/get', express.json(), lotdb.getLots);
  router.get('/api/db/get/:lotId', lotdb.getLotByIdApi);
  router.post('/api/db/get-by-handle', lotdb.getLotByHandleApi);
  router.post('/api/db/new-lot', lotdb.newLot);
  router.post('/api/db/edit-lot/:lotId', lotdb.editLotMetadata);
  router.post('/api/db/delete-lot', lotdb.deleteLot);
  router.post('/api/db/save-manifest', lotdb.saveManifest);
  router.get('/api/db/manifest/:manifestId', lotdb.getManifest);
  router.post('/api/db/upload-lot-manifest/:lotId', lotdb.uploadManifest);

  // bstock db api
  router.post('/api/bstock-db/auctions/get', auth.isAuthorized('LIST_AUCTIONS'), express.json(), bstockDb.getAuctions);

  // product data
  router.get('/api/product-data/:barcode', (req,res)=>{
    productData.getProductDataByBarcode(req.params.barcode).then(resp=>{
      res.json(resp);
    });
  });

  // import & register routers
  router.use('/api/listings', require('./listings')( { listings, lotdb } ));
  router.use('/api/image', require('./images')( { lotdb } ) );
  router.use('/api/print', require('./print')( { inventoryCommander, lotdb: lotdb } ) );
  router.use('/api/manifests', require('./manifests'));
  router.use(
    '/api/reports',
    auth.isAuthorized('VIEW_REPORT'),
    require('./reports')( { shopifyDumpDb })
  );


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

  // Shipping rates on Shopify store
  router.use('/api/shipping-rates/store', require('./shipping-rates/store')( { shopifyGql } ));

  // dynamically created JS scripts for the client
  router.get('/build/ng-app-server-data.js', (req,res)=>{
    res.send(scriptBuilder.ngAppServerData());
  });

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