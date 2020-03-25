const path = require('path');

const express = require('express');
const router = new express.Router();
module.exports = router;

const manifestSvc = require(path.join(__basedir, __config.modulesPath, 'manifest-svc'));

// Manifests endpoints
router.get('/get', function get( req, res ) {

  const file = `${ req.query.private ? 'private' : 'public' }/${req.query.file}`;

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

router.get('/list', ( req, res ) => {

  const qp = {};
  if( req.query.num ) {
    qp.num = req.query.num;
  }
  if( req.query.continuation_token ) {
    qp.continuation_token = req.query.continuation_token;
  }

  qp.prefix = req.query.lot_id ? `public/${req.query.lot_id}` : 'private';

  manifestSvc.list(qp)
    .then( manifests => {
      res.json(manifests);
    })
    .catch(e => {
      console.log(e)
      res.json({
        "status": "failed",
        "message": `Unable to get manifets list`
      });
    });
});
