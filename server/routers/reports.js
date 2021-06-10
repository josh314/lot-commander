const express = require('express');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');


function routes( { shopifyDumpDb } ) {
  const router = new express.Router();

  router.get('/units-sold', async ( req, res ) => {

    const unitsSoldRequestParams = {
      dateBinSize: (req.query.bin_size == 'day'  || req.query.bin_size == 'week') ? req.query.bin_size : 'month'
    };
    if( req.query.start_date ) {
      unitsSoldRequestParams.start = moment(req.query.start_date).startOf('day').toDate();
    }
    if( req.query.end_date ) {
      unitsSoldRequestParams.end = moment(req.query.end_date).endOf('day').toDate();
    }
    if( req.query.tag ) {
      unitsSoldRequestParams.tag = req.query.tag;
    }

    shopifyDumpDb.unitsSold( unitsSoldRequestParams )
      .then( resp => res.json(resp) );

  });

  router.get('/pallets-sold', async ( req, res ) => {
    const palletsSoldRequestParams = {
      dateBinSize: (req.query.bin_size == 'day'  || req.query.bin_size == 'week') ? req.query.bin_size : 'month'
    };
    if( req.query.start_date ) {
      palletsSoldRequestParams.start = moment(req.query.start_date).startOf('day').toDate();
    }
    if( req.query.end_date ) {
      palletsSoldRequestParams.end = moment(req.query.end_date).endOf('day').toDate();
    }
    if( req.query.tag ) {
      palletsSoldRequestParams.tag = req.query.tag;
    }

    shopifyDumpDb.palletsSold( palletsSoldRequestParams )
      .then( resp => res.json(resp) );

  });

  return router;
}

module.exports = routes;
