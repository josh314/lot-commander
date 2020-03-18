const path = require('path');

const express = require('express');
const router = new express.Router();
module.exports = router;

const manifestSvc = require(path.join(__basedir, __config.modulesPath, 'manifest-svc'));

// Manifests endpoints
router.get('/get', manifestSvc.get);







