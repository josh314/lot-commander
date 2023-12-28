const express = require('express');

const auth = require('../auth');

module.exports = routes;


/**********************************************
 * Helpers
 * =======
 *
 *********/

const listJobsFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.type ) {
    fp.type = qp.type;
  }

  if( qp.name ) {
    fp.name = qp.name;
  }

  return fp;
};


/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

function routes({ scheduler }) {
  const router = new express.Router();

  /******************************************
   * Register route handlers
   * ======
   *
   ****/


  router.get(
    '/jobs',
    auth.isAuthorized( 'VIEW_MAILCHIMP_SCHEDULE' ),
    listJobs
  );

  router.post(
    '/jobs',
    auth.isAuthorized( 'CREATE_MAILCHIMP_SCHEDULE' ),
    createJob
  );

  router.get(
    '/jobs/:jobId',
    auth.isAuthorized( 'VIEW_MAILCHIMP_SCHEDULE' ),
    getJob
  );

  router.put(
    '/jobs/:jobId',
    auth.isAuthorized( 'EDIT_MAILCHIMP_SCHEDULE' ),
    updateJob
  );

  router.put(
    '/jobs/:jobId/interval',
    auth.isAuthorized( 'EDIT_MAILCHIMP_SCHEDULE' ),
    updateJobInterval
  );

  router.put(
    '/jobs/:jobId/when',
    auth.isAuthorized( 'EDIT_MAILCHIMP_SCHEDULE' ),
    updateJobWhen
  );

  router.put(
    '/jobs/:jobId/data',
    auth.isAuthorized( 'EDIT_MAILCHIMP_SCHEDULE' ),
    updateJobData
  );

  /*******************************************
   * Define Handlers
   * ===============
   *
   ****/


  async function listJobs( req, res, next ) {

    try {

      const numPage = parseInt( req.query.num ) || 10;
      const page = parseInt( req.query.page ) || 1;

      const query = {
        // paging
        skip: ( page - 1 ) * numPage,
        num: numPage,

        // sorting
        sort: req.query.sort,
        sortDir: parseInt(req.query.sort_dir) || 1,

        // filters
        filterParams: listJobsFilterParamsFromQueryParams( req.query ),

      };

      const jobs = await scheduler.listMailchimpJobs( query );

      res.json( { jobs } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function getJob( req, res, next ) {

    try {

      const jobId = req.params.jobId;

      const job = await scheduler.getMailchimpJobBy( jobId );

      res.json( { job } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function updateJob( req, res, next ) {

    try {

      const jobId = req.params.jobId;

      const { interval, when, data } = req.body;

      const job = await scheduler.updateMailchimpJob( jobId, { interval, when, data } );

      res.json( { job } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function updateJobData( req, res, next ) {

    try {

      const jobId = req.params.jobId;
      const { data } = req.body;

      const job = await scheduler.updateMailchimpJobData( jobId, data );

      res.json( { job } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function updateJobInterval( req, res, next ) {

    try {

      const jobId = req.params.jobId;
      const { interval } = req.body;

      const job = await scheduler.updateMailchimpJobInterval( jobId, interval );

      res.json( { job } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function updateJobWhen( req, res, next ) {

    try {

      const jobId = req.params.jobId;
      const { when } = req.body;

      const job = await scheduler.updateMailchimpJobWhen( jobId, when );

      res.json( { job } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function createJob( req, res, next ) {

    try {

      const job = await scheduler.createMailchimpJob( req.body );

      res.json( { job } );

    }
    catch(e) {
      return next(e);
    }

  }



  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}