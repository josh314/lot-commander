const path = require('path');
const express = require('express');

const assetsData = require(path.join(__basedir, __config.modulesPath, 'assets-data'));

const scriptBuilder = require(path.join(__basedir, __config.modulesPath, 'script-builder'));

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const manifestFiles = require(path.join(__basedir, __config.modulesPath, 'manifest-files'));
const images = require(path.join(__basedir, __config.modulesPath, 'images'));
const users = require(path.join(__basedir, __config.modulesPath, 'users'));
const listings = require(path.join(__basedir, __config.modulesPath, 'listings'));

function getLayoutDataByEnv(env) {
	const res = {
	  title: "Lot Commander",
	  description: "App for creating and managing product lots and associated manifests.",
	};

  let assets;
	if(env === 'prod') {
    assets = assetsData.prod
	}
  else {
    assets = assetsData.dev
  }

  res.assets = assets;

  return res;
}

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
  router.post('/api/db/save-manifest', lotdb.saveManifest);
  router.get('/api/db/manifest/:manifestId', lotdb.getManifest);
  router.post('/api/db/link-3p-manifest-block', lotdb.link3pManifestBlock);

  // interact with manifest database
  // router.post('/api/db/get', mandb.getManifests);
  // router.post('/api/db/submit/:manifestId', mandb.submitManifest);
  // router.post('/api/db/submit', mandb.submitManifest);
  // router.get('/api/db/delete/:manifestId', mandb.deleteManifest);

  // deal with files
  router.get('/api/manifest-files/list', manifestFiles.listManifestFiles);
  router.post('/api/manifest-files/generate', manifestFiles.generateManifestFile);
  router.get('/api/manifest-files/download/:file', manifestFiles.downloadManifestFile);
  router.post('/api/manifest-files/upload', manifestFiles.submit3pManifest);
  // router.get('/api/files/delete/:manifestId', files.deleteManifestFile);
  router.post('/api/image/upload', images.upload);
  router.post('/api/image/primary', lotdb.setPrimaryImage);
  router.get('/api/image/download/:lotId', images.downloadImages);
  router.post('/api/image/remove', images.removeImage);

  // marketplace listings
  router.post('/api/listings/submit', listings.submit);

  // dynamically created JS scripts for the client
  router.get('/build/ng-app-server-data.js', (req,res)=>{
    res.send(scriptBuilder.ngAppServerData());
  });

  //default route. the front-end rendering will all hit this.
  router.get('*', (req,res) => res.render('main.hbs', getLayoutDataByEnv(env)) );

  return router;
}



module.exports = routes;