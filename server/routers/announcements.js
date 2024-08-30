const express = require('express');

const auth = require('../auth');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 *
 *********/

const listSiteAnnouncementsFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.is_active ) {
    fp.isActive = !! parseInt( qp.is_active );
  }

  return fp;
};

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes( { siteAnnouncements } ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.get(
    '/',
    auth.isSuperuser,
    listAnnouncements
  );
  router.get(
    '/count',
    auth.isSuperuser,
    countAnnouncements
  );
  router.get(
    '/:announcementId',
    auth.isSuperuser,
    getAnnouncementById
  );
  router.delete(
    '/:announcementId',
    auth.isSuperuser,
    deleteAnnouncement
  );

  router.post(
    '/',
    auth.isSuperuser,
    createAnnouncement
  );
  router.patch(
    '/:announcementId',
    auth.isSuperuser,
    editAnnouncement
  );

  /*******************************************
   * Define route handlers
   * ======
   *
   ****/

  async function listAnnouncements( req, res ) {

    const numPage = parseInt( req.query.num ) || 10;
    const page = parseInt( req.query.page ) || 1;

    const query = {
      // paging
      skip: ( page - 1 ) * numPage,
      num: numPage,

      // sorting
      sort: req.query.sort,
      sortDir: parseInt(req.query.sort_dir),

      // filters
      filterParams: listSiteAnnouncementsFilterParamsFromQueryParams( req.query ),

    };

    const announcements = await siteAnnouncements.list( query );

    res.json( { announcements } );

  }

  async function countAnnouncements( req, res ) {

    const count = await siteAnnouncements.count( listSiteAnnouncementsFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });

  }

  async function getAnnouncementById( req, res, next ) {

    try {

      const { announcementId } = req.params;

      const announcement = await siteAnnouncements.get( announcementId );

      res.json( { announcement } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function createAnnouncement( req, res, next  ) {

    try {

      const { announcement } = await siteAnnouncements.create( req.body );

      res.json( { announcement } );

    }
    catch(e) {

      return next( e );

    }

  }


  async function deleteAnnouncement( req, res, next ) {

    try {

      const { announcementId } = req.params;
      await siteAnnouncements.delete( announcementId );

      res.json( { success: true } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function editAnnouncement( req, res, next ){

    try {

      const { announcementId } = req.params;
      const editDocument = req.body;

      const { announcement } = await siteAnnouncements.edit( announcementId, editDocument );

      res.json( { announcement } );

    }
    catch(e) {
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