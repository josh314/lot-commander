const express = require('express');

const auth = require('../auth');

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ countCommander }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.post(
    '/',
    auth.isAuthorized( 'CREATE_COUNTER' ),
    initializeCounter
  );
  router.get(
    '/:handle',
    auth.isAuthorized( 'VIEW_COUNTER' ),
    getCounter
  );
  router.post(
    '/:handle',
    auth.isAuthorized( 'EDIT_COUNTER' ),
    incrementCounter
  );


  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/


  async function getCounter( req, res, _next ) {

    const handle = req.params.handle;
    const counter = await countCommander.getCounter( handle );

    res.json( { counter } );
  }

  async function incrementCounter( req, res, _next ) {

    const handle = req.params.handle;
    const { increment } = req.body;

    const counter = await countCommander.incrementCounter( handle, increment );

    res.json( { counter } );
  }

  async function initializeCounter( req, res, _next ) {

    const { handle, count } = req.body;

    const counter = await countCommander.initializeCounter( handle, count );

    res.json( { counter } );
  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}