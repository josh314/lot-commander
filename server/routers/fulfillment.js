const express = require('express');
const auth = require('../auth');
const helpers = require('../helpers');
const { InvalidRequestError } = require('../errors');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 * 
 *********/

const listOrdersFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle, 'i');
  }

  if( qp.shopify_order_id ) {
    fp.shopifyOrderId = parseInt( qp.shopify_order_id )
  }

  if( 'shipped' in qp ) {
    fp.isShipped = !!parseInt( qp.shipped );
  }

  //TODO: pending, date ranges, line items

  return fp;
};

function routes({ eventsDb, fulfillmentCommander }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get(
    '/',
    auth.isAuthorized( 'VIEW_ORDER' ),
    listOrders
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_ORDER' ),
    countOrders
  );
  router.get(
    '/:orderId',
    auth.isAuthorized( 'VIEW_ORDER' ),
    getOrderById
  );
  // TODO:
  // router.get(
  //   '/handle/:orderId',
  //   auth.isAuthorized( 'VIEW_ORDER' ),
  //   getOrderByHandle
  // );


    /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function listOrders( req, res ) {

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
      filterParams: listOrdersFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: helpers.populationPathsFromQuery( req.query )
    };

    const orders = await fulfillmentCommander.listOrders(query);

    res.json( { orders } );
  };

  async function countOrders( req, res ) {
  
    const count = await fulfillmentCommander.countOrders( listOrdersFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
  }

  async function getOrderById( req, res, next ) {

    try {

      const orderId = req.params.orderId;
      const populate = helpers.populationPathsFromQuery( req.query );

      const order = await fulfillmentCommander.getOrderById( orderId, { populate } );

      res.json( { order } );
    }
    catch(e) {
      return next( e );
    }

  };

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}
