const express = require('express');
const dayjs = require('dayjs');

const auth = require('../auth');


/**********************************************
 * Helpers
 * =======
 *
 *********/

const listShopifyOrdersParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.to_be_fulfilled ) {
    fp.toBeFulfilled = !!parseInt( qp.to_be_fulfilled );
  }

  if( qp.start_date ) {
    const startDate = dayjs( qp.start_date ).startOf('day').toDate();

    if( !isNaN( startDate ) ) {
      fp.startDate = startDate;
    }

  }

  if( qp.end_date ) {
    const endDate = dayjs( qp.end_date ).endOf('day').toDate();

    if( !isNaN( endDate ) ) {
      fp.endDate = endDate;
    }

  }

  return fp;
};


function routes( { shopifyOrders } ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  // view order(s)
  router.get(
    '/',
    auth.isAuthorized( 'LIST_SHOPIFY_ORDERS' ),
    listShopifyOrders
  );
  router.get(
    '/count',
    auth.isAuthorized( 'LIST_SHOPIFY_ORDERS' ),
    countShopifyOrders
  );
  router.get(
    '/:id',
    auth.isAuthorized( 'VIEW_SHOPIFY_ORDER' ),
    getShopifyOrderById
  );
  router.get(
    '/shopify-id/:id',
    auth.isAuthorized( 'VIEW_SHOPIFY_ORDER' ),
    getShopifyOrderByShopifyId
  );
  router.get(
    '/shopify-order-number/:orderNumber',
    auth.isAuthorized( 'VIEW_SHOPIFY_ORDER' ),
    getShopifyOrderByShopifyOrderNumber
  );


  /*******************************************
   * Define Handlers & Middleware
   * ===============
   *
   ****/

  async function listShopifyOrders( req, res, next ) {

    try {
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
        filterParams: listShopifyOrdersParamsFromQueryParams( req.query ),

      };

      let orders = await shopifyOrders.listShopifyOrders( query );

      if( 'annotate' in req.query && !!parseInt( req.query.annotate ) ) {

        orders = orders.map( o => o.toObject( { virtuals: true } ));

      }

      res.json( { orders } );
    }
    catch(e) {
      next(e);
    }

  }

  async function countShopifyOrders( req, res, next ) {

    try { 
      const count = await shopifyOrders.countShopifyOrders( listShopifyOrdersParamsFromQueryParams( req.query ) );

      res.json({ count });
    }
    catch(e) {
      next(e);
    }

  }


  async function getShopifyOrderById( req, res, next ) {

    try {

      const id = req.params.id;

      let order = await shopifyOrders.getShopifyOrderById( id );

      if( order && 'annotate' in req.query && !!parseInt( req.query.annotate ) ) {

        order = order.toObject( { virtuals: true } );

      }

      res.json( { order } );
    }
    catch(e) {
      return next( e );
    }

  }


  async function getShopifyOrderByShopifyId( req, res, next ) {

    try {

      const id = req.params.id;

      let order = await shopifyOrders.getShopifyOrderByShopifyId( id );

      if( order && 'annotate' in req.query && !!parseInt( req.query.annotate ) ) {

        order = order.toObject( { virtuals: true } );

      }

      res.json( { order } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function getShopifyOrderByShopifyOrderNumber( req, res, next ) {

    try {

      const orderNumber = req.params.orderNumber;

      let order = await shopifyOrders.getShopifyOrderByShopifyOrderNumber( orderNumber );

      if( order && 'annotate' in req.query && !!parseInt( req.query.annotate ) ) {

        order = order.toObject( { virtuals: true } );

      }

      res.json( { order } );
    }
    catch(e) {
      return next( e );
    }

  }



  return router;
}

module.exports = routes;
