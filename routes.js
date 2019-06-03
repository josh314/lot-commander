const path = require('path');
const express = require('express');

const scriptBuilder = require(path.join(__basedir, __config.modulesPath, 'script-builder'));

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const bstockDb = require(path.join(__basedir, __config.modulesPath, 'bstock-db'));
const manifests = require(path.join(__basedir, __config.modulesPath, 'manifests'));
const images = require(path.join(__basedir, __config.modulesPath, 'images'));
const users = require(path.join(__basedir, __config.modulesPath, 'users'));
const listings = require(path.join(__basedir, __config.modulesPath, 'listings'));
// const imports = require(path.join(__basedir, __config.modulesPath, 'imports'));
const productData = require(path.join(__basedir, __config.modulesPath, 'product-data'));

const labels = require(path.join(__basedir, __config.modulesPath, 'labels'));

// middleware to stick for testing purposes
function testLog(s) {
  return function testLog(req, res, next) {
    console.log(s);
    next();
  }
}

//routes
function routes(env) {

  const router = new express.Router();

  // =====================================
  // USERS SECTION =======================
  // =====================================
  // we will want this protected so you have to be logged in to visit
  // we will use route middleware to verify this (the isLoggedIn function)
  // router.get('/api/users/all', users.api.isManager, users.api.getAllUsers);
  // router.post('/api/users/new', users.api.canCreateNewUsers, users.api.createUser);
  router.post('/api/users/change-password', users.api.isLoggedIn, users.api.changeUserPassword);
  // router.get('/api/users/get/:username', users.api.isLoggedIn , users.api.getUserInfo );
  // router.post('/api/users/edit-role', users.api.isManager, users.api.editUserRole);

  // lot database api
  router.post('/api/db/get', express.json(), lotdb.getLots);
  router.get('/api/db/get/:lotId', lotdb.getLotByIdApi);
  router.post('/api/db/new-lot', lotdb.newLot);
  router.post('/api/db/edit-lot/:lotId', lotdb.editLotMetadata);
  router.post('/api/db/delete-lot', lotdb.deleteLot)
  router.post('/api/db/save-manifest', lotdb.saveManifest);
  router.get('/api/db/manifest/:manifestId', lotdb.getManifest);
  router.post('/api/db/link-3p-manifest-block', lotdb.link3pManifestBlock);
  router.post('/api/db/import-3p-manifest-block', lotdb.import3pManifestBlock);

  // bstock db api
  router.post('/api/bstock-db/auctions/get', express.json(), bstockDb.getAuctions);

  // interact with manifest database
  // router.post('/api/db/get', mandb.getManifests);
  // router.post('/api/db/submit/:manifestId', mandb.submitManifest);
  // router.post('/api/db/submit', mandb.submitManifest);
  // router.get('/api/db/delete/:manifestId', mandb.deleteManifest);

  // deal with files
  router.get('/api/manifest-files/list', manifests.listManifestFiles);
  router.post('/api/manifest-files/generate', manifests.generateManifestFile);
  router.get('/api/manifest-files/download/:file', manifests.downloadManifestFile);
  router.post('/api/manifest-files/upload', manifests.submit3pManifest);
  // router.get('/api/files/delete/:manifestId', files.deleteManifestFile);
  router.post('/api/image/upload', images.upload);
  router.post('/api/image/primary', lotdb.setPrimaryImage);
  router.get('/api/image/download/:lotId', images.downloadImages);
  router.post('/api/image/remove', images.removeImage);
  router.post('/api/image/delete', images.deleteImageFile);

  // marketplace listings
  router.post('/api/listings/submit', listings.submit);

  // //import functionality
  // router.post('/api/imports/manifest', imports.importManifestApi);
  // router.post('/api/imports/barcodes', express.json(), imports.importBarcodesApi);

  router.get('/api/labels/:sku/:numLabels', labels.generate);

  // product data
  router.get('/api/product-data/:barcode', (req,res)=>{
    productData.getProductDataByBarcode(req.params.barcode).then(resp=>{
      res.json(resp);
    });
    // why doesn't .then(res.json) work?
  });

  // dynamically created JS scripts for the client
  router.get('/build/ng-app-server-data.js', (req,res)=>{
    res.send(scriptBuilder.ngAppServerData());
  });

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