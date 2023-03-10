const path = require('path');

const express = require('express');

const manifestSvc = require(path.join(__basedir, __config.modulesPath, 'manifest-svc'));

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes( { manifests } ) {

  const router = new express.Router();

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
      .then( _manifests => {
        res.json( _manifests );
      })
      .catch(e => {
        console.error(e);
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
          });
        }
        else {
          console.log('Streaming response...');
          resp.data.pipe(res);
        }
      })
      .catch(e => {
        console.error(e);
        res.json({
          "status": "failed",
          "message": `Unable to get object: '${key}'`
        });
      });
  });

  /**************************************
   * Put
   * ====
   *
   * Upserts an individual manifest to S3.
   * If the URL path begins with public/private, the S3 is exactly given by the URL path.
   * If not, 'private' will end up being prepended to create the final S3 key (therefore somewhat violating RESTful principles)
   *
   ********************/
  router.put('/*', ( req, res ) => {
    const paths = req.params[0].split('/');

    let isPublic, saveAs;
    if( paths[0] === 'public' || paths[0] === 'private' ) {
      isPublic = ( paths[0] === 'public' );
      saveAs = paths.slice(1).join('/');
    }
    else {
      isPublic = false;
      saveAs = paths.join('/');
    }

    const { sheets } = req.body;

    manifestSvc.build( sheets, saveAs, isPublic )
      .then( resp => {
      //
        console.log('JSON response...');
        res.json(resp.data);
      });
  });


  /**************************************
   * Post
   * ====
   *
   * Builds a manifest from posted data and immediately returns it as a stream.
   *
   ********************/
  router.post('/', ( req, res ) => {
    const { sheets } = req.body;

    manifestSvc.build( sheets )
      .then( resp => {
        console.log('Streaming response...');
        resp.data.pipe(res);
      });
  });

  /*****************************************
   * Generate
   * ========
   *
   * Generates a manifest and saves to S3
   *
   * ****************************************/
  router.post('/generate', async ( req, res, next ) => {

    try {

      if( !req.body || !req.body.lotId ) {
        res.json({ error: '__LOT_ID_REQUIRED__' });
      }

      const generateManifestOptions = {
        save: 'save' in req.body ? req.body.save : true,
        bstock: 'bstock' in req.body ? req.body.bstock : false,
      };

      const generatedManifest = await manifests.generateLotManifest( req.body.lotId, generateManifestOptions );

      if( generateManifestOptions.save ) {
        res.json( generatedManifest );
      }
      else {
        res.pipe( generatedManifest );
      }
    }
    catch( e ) {
      next( e );
    }

  });

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}