const path = require('path');

const express = require('express');
const router = new express.Router();
module.exports = router;

const manifestSvc = require(path.join(__basedir, __config.modulesPath, 'manifest-svc'));

// Manifests endpoints
router.get('/get', function get( req, res ) {

  const file = `${ req.query.internal ? 'internal' : 'public' }/${req.query.file}`;

  manifestSvc.get(file)
    .then( resp => {
      if( resp.data.error === 'NoSuchKey') {
        res.json({
          status: "failed",
          message: `File does not exist: ${file}`
        })
      }
      else {
        console.log('Streaming response...')
        resp.data.pipe(res);
      }
    })
    .catch(e => {
      console.log(e)
      res.json({
        "status": "failed",
        "message": `Unable to get object: '${file}'`
      });
    });
});
