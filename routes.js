const path = require('path');
const express = require('express');

const config = require(path.join(__basedir, 'config'));

const assetsData = require(path.join(__basedir, config.modulesPath, 'assets-data'));

const lotdb = require(path.join(__basedir, config.modulesPath, 'lot-db'));
const files = require(path.join(__basedir, config.modulesPath, 'files'));

const users = require(path.join(__basedir, config.modulesPath, 'users'));

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
  router.post('/api/db/get', lotdb.getLots);
  router.get('/api/db/get/:lotId', lotdb.getLotById);
  router.post('/api/db/new-lot', lotdb.newLot);
  router.post('/api/db/edit-lot/:lotId', lotdb.editLotMetadata);
  router.post('/api/db/save-manifest', lotdb.saveManifest);
  router.get('/api/db/manifest/:manifestId', lotdb.getManifest);

  // interact with manifest database
  // router.post('/api/db/get', mandb.getManifests);
  // router.post('/api/db/submit/:manifestId', mandb.submitManifest);
  // router.post('/api/db/submit', mandb.submitManifest);
  // router.get('/api/db/delete/:manifestId', mandb.deleteManifest);

  // deal with files
  router.get('/api/files/list', files.listManifestFiles);
  router.post('/api/files/generate', files.generateManifestFile);
  router.get('/api/files/download/:file', files.downloadManifestFile);
  // router.get('/api/files/delete/:manifestId', files.deleteManifestFile);

  // dynamically created JS scripts for the client
  router.get('/db-enums.js', (req,res)=>{
    const enums = {
      lotStatus: lotdb.lotStatusEnum,
    }
    res.send('var dbEnums = '+ JSON.stringify(enums));
  })

  //default route. the front-end rendering will all hit this.
  router.get('*', (req,res) => res.render('main.hbs', getLayoutDataByEnv(env)) );

  return router;
}



module.exports = routes;