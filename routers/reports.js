const express = require('express');
const moment = require('moment');


function routes( shopifyGqlClient ) {
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

  return router;
}

module.exports = routes;
