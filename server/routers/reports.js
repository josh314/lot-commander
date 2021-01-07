const express = require('express');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');


function routes( { shopifyGqlClient, shopifyDumpDb } ) {
  const router = new express.Router();

  router.get('/orders', ( req, res ) => {

    const orderHistoryRequestParams = {};
    if( req.query.start_date ) {
      orderHistoryRequestParams.start = moment(req.query.start_date).format();
    }
    if( req.query.end_date ) {
      orderHistoryRequestParams.end = moment(req.query.end_date).format();
    }
    if( req.query.cursor ) {
      orderHistoryRequestParams.cursor = req.query.cursor;
    }

    shopifyGqlClient.getOrderHistory( orderHistoryRequestParams )
      .then( resp => res.json(resp) );

  });

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
