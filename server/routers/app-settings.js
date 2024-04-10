const express = require('express');

const auth = require('../auth');

module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes({ appSettings }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.get(
    '/',
    // No auth required
    listAppSettings
  );
  router.get(
    '/:name',
    // No auth required
    getAppSettingByName
  );
  router.post(
    '/:name',
    auth.isAuthorized( 'EDIT_APP_SETTING' ),
    setAppSetting
  );
  router.post(
    '/',
    auth.isAuthorized( 'CREATE_APP_SETTING' ),
    createAppSetting
  );



  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/

  async function listAppSettings( _req, res, next ) {

    try {
      const { settings } = await appSettings.list();

      res.json( { settings } );
    }
    catch( e ) {
      return next( e );
    }

  }


  async function getAppSettingByName( req, res, next ) {

    try {

      const { name } = req.params;

      const { setting } = await appSettings.getByName( name );

      res.json( { setting } );

    }
    catch( e ) {
      return next( e );
    }

  }

  async function setAppSetting( req, res, next ) {

    try {

      const { name } = req.params;
      const { value } = req.body;

      const { setting } = await appSettings.setValue( name, value );

      res.json( { setting } );

    }
    catch( e ) {
      return next( e );
    }

  }

  async function createAppSetting( req, res, next ) {

    try {

      const { name, displayName, value, type } = req.body;

      const appSetting = await appSettings.create( { name, displayName, value, type } );

      res.status( 201 ).json( appSetting );

    }
    catch( e ) {
      return next( e );
    }

  }


  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}