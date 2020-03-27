const path = require('path');

const express = require('express');
const router = new express.Router();
module.exports = router;

const manifestSvc = require(path.join(__basedir, __config.modulesPath, 'manifest-svc'));

/**************************************
 * List
 * ====
 *
 * This endpoint gets all manifests.
 * params:
 *   - num
 *   - continuation_token : for paging results
 *   - prefix : to narrow list to keys with a given prefix
 *
 ********************/
router.get('/', ( req, res ) => {

  manifestSvc.list( req.query )
    .then( manifests => {
      res.json(manifests);
    })
    .catch(e => {
      console.log(e)
      res.json({
        "status": "failed",
        "message": `Unable to get manifest list`
      });
    });
});

/**************************************
 * Get
 * ====
 *
 * Get an individual manifest. The URI path parameter(s) is the full S3 key
 *
 ********************/
router.get('/*', function get( req, res ) {

  const key = req.params[0];

  manifestSvc.get(key)
    .then( resp => {
      if( resp.data.error === 'NoSuchKey') {
        res.json({
          status: "failed",
          message: `File does not exist: ${key}`
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
        "message": `Unable to get object: '${key}'`
      });
    });
});

router.post('/build', ( req, res ) => {
  const { saveAs, isPublic, sheets } = req.body;
  manifestSvc.build( sheets, saveAs, isPublic )
  .then( resp => {
    if(saveAs) {
      console.log('JSON response...');
      res.json(resp.data);
    }
    else {
      console.log('Streaming response...');
      resp.data.pipe(res);
    }
  });
});