const path = require('path');

const express = require('express');

const auth = require('../auth');
const helpers = require('../helpers');
const {
  ResourceNotFoundError,
  ChildResourceNotFoundError,
  InvalidRequestError,
  IllegalActionError
} = require('../errors');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 *
 *********/

const listClaimsFilterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.include_closed ) {
    fp.includeClosed = !!parseInt(qp.include_closed);
  }

  if( qp.to_be_reviewed ) {
    fp.toBeReviewed = !!parseInt(qp.to_be_reviewed);
  }

  if( qp.order_number ) {
    fp.orderNumber = new RegExp( qp.order_number, 'i');
  }

  if( qp.ticket ) {
    fp.ticketId = qp.ticket;
  }


  return fp;
};

/**********************************************
 * Router
 * =======
 *
 *********/

function routes( { claimsCommander, eventsDb, manifestSvc, shopifyAdmin } ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  /*******  GET  *********/

  // list claim(s)
  router.get(
    '/',
    auth.isAuthorized( 'VIEW_CLAIM' ),
    listClaims
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_CLAIM' ),
    countClaims
  );
  router.get(
    '/:claimId',
    auth.isAuthorized( 'VIEW_CLAIM' ),
    getClaimById
  );

  router.get(
    '/:claimId/shopify-order',
    auth.isAuthorized( 'VIEW_CLAIM' ),
    getClaimShopifyOrder
  );

  // get an order so as to start a claim
  router.get(
    '/orders/:orderNumber',
    auth.isAuthorized( 'VIEW_CLAIM' ),
    getOrderForClaim
  );

  // the following endpoints exist for semantic reasons as they just redirect to /api/manifests/
  router.get(
    '/manifests/:spreadsheetId',
    auth.isAuthorized( 'VIEW_CLAIM' ),
    ( req, res, _next ) => {

      const { spreadsheetId } = req.params;
      res.redirect(`/api/manifests/google/${spreadsheetId}`);

    }
  );

  router.get(
    '/manifests/:spreadsheetId/totals',
    auth.isAuthorized( 'VIEW_CLAIM' ),
    ( req, res, _next ) => {

      const { spreadsheetId } = req.params;
      res.redirect(`/api/manifests/google/${spreadsheetId}/totals`);

    }
  );

  /*******  DELETE  *********/

  router.delete(
    '/:claimId',
    auth.isAuthorized( 'DELETE_CLAIM' ),
    deleteClaim
  );

  router.delete(
    '/:claimId/order-items/:orderItemId/claim',
    auth.isAuthorized( 'EDIT_CLAIM' ),
    deleteOrderItemClaim
  );

  /*******  POST  *********/

  router.post(
    '/',
    auth.isAuthorized( 'CREATE_CLAIM' ),
    startClaim
  );

  /*******  PUT  *********/

  router.put(
    '/:claimId/tickets',
    auth.isAuthorized( 'EDIT_CLAIM' ),
    setClaimTickets
  );

  router.put(
    '/:claimId/is-closed',
    auth.isAuthorized( 'CLOSE_CLAIM' ),
    setClaimIsClosed
  );

  router.put(
    '/:claimId/to-be-reviewed',
    auth.isAuthorized( 'EDIT_CLAIM' ),
    setClaimToBeReviewed
  );

  router.put(
    '/:claimId/order-items/:orderItemId/claim',
    auth.isAuthorized( 'EDIT_CLAIM' ),
    startOrderItemClaim
  );

  /*******  PATCH  *********/


  router.patch(
    '/:claimId/order-items/:orderItemId/claim/',
    auth.isAuthorized( 'EDIT_CLAIM' ),
    updateOrderItemClaim
  );

  router.patch(
    '/:claimId/notes',
    auth.isAuthorized( 'EDIT_CLAIM' ),
    addClaimNote
  );

  //==================
  // handlers


  async function listClaims( req, res ) {

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
      filterParams: listClaimsFilterParamsFromQueryParams( req.query ),

      // populate options
      populate: helpers.populationPathsFromQuery( req.query )
    };

    const claims = await claimsCommander.listClaims(query);

    const orderIds = claims.reduce( ( acc, _claim ) => acc.concat( [ _claim.orderId ] ) , []);

    const { orders } = await shopifyAdmin.shopifyRest.listOrders( { ids: orderIds.join(',') } );

    for( let _order of orders ) {

      const _claim = claims.find( _c => _c.orderId == _order.id );

      if( _claim ) {
        // this is required to set _claim.shopifyOrder = _order since there is no shopifyOrder field in the Claim model
        _claim.set( 'shopifyOrder', _order, { strict: false } );
      }

    }

    res.json( { claims } );
  }

  async function countClaims( req, res ) {

    const count = await claimsCommander.countClaims( listClaimsFilterParamsFromQueryParams( req.query ) );

    res.json({ count: count });

  }

  async function getClaimById( req, res, next ) {

    try {

      const claimId = req.params.claimId;
      const populate = helpers.populationPathsFromQuery( req.query );
      const getShopifyOrder = !!parseInt( req.query.shopify_order );

      const claim = await claimsCommander.getClaimById( claimId, { populate } );

      if( !claim ) {
        throw new ResourceNotFoundError( { type: 'Claim', id: claimId } );
      }

      if( getShopifyOrder ) {

        const { order } = await shopifyAdmin.shopifyRest.getOrder( claim.orderId );

        // this is required to set claim.shopifyOrder = order since there is no shopifyOrder field in the Claim model
        claim.set( 'shopifyOrder', order, { strict: false } );

      }

      res.json( { claim } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function getClaimShopifyOrder( req, res, next ) {

    try {

      const claimId = req.params.claimId;
      const claim = await claimsCommander.getClaimById( claimId );

      if( !claim ) {
        throw new ResourceNotFoundError( { type: 'Claim', id: claimId } );
      }

      const { order: shopifyOrder } = await shopifyAdmin.shopifyRest.getOrder( claim.orderId );

      if( !shopifyOrder ) {
        throw new ResourceNotFoundError( { type: 'Shopify order', id: claim.orderId } );
      }

      res.json( { shopifyOrder } );
    }
    catch(e) {
      return next( e );
    }

  }

  async function deleteClaim( req, res, next ) {

    try {

      const claimId = req.params.claimId;

      const claim = await claimsCommander.getClaimById( claimId );

      if( !claim ) {
        throw new ResourceNotFoundError( { type: 'Claim', id: claimId } );
      }

      for( let orderItem of claim.orderItems ) {

        if( orderItem.claim ) {

          if( orderItem.claim.manifest && orderItem.claim.manifest.spreadsheetId ) {

            await manifestSvc.deleteGoogleSpreadsheet( orderItem.claim.manifest.spreadsheetId );

          }

          await claim.deleteOrderItemClaim( orderItem._id );

        }

      }

      await claimsCommander.deleteClaim( claimId );

      eventsDb.deleteClaim( { user: req.user, claimId } );

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  }


  async function getOrderForClaim( req, res, next ) {

    try {

      const { orderNumber } = req.params;

      const { orders } = await shopifyAdmin.shopifyRest.listOrders( { name: orderNumber } );

      const orderNumbers = orders.map( _ => _.order_number );


      const claims = await claimsCommander.listClaims( { filterParams: { orderNumber: { $in: orderNumbers }, includeClosed: true } } );

      for( let _claim of claims ) {

        const _order = orders.find( _ => _.order_number == _claim.orderNumber );

        _order.claim = _claim;

      }

      res.json( { orders } );
    }
    catch(e) {
      return next(e);
    }

  }

  async function startClaim( req, res, next ) {

    try {

      const { orderId } = req.body;

      if( !orderId ) {
        throw new InvalidRequestError();
      }

      const existingClaim = await claimsCommander.findClaimByOrderId( `${orderId}` );

      if( existingClaim ) {
        throw new IllegalActionError( `Claim already exists for order #${ existingClaim.orderNumber }.`, 'DUPLICATE_ORDER_CLAIM' );
      }

      const { order: shopifyOrder } = await shopifyAdmin.shopifyRest.getOrder( orderId );

      if( !shopifyOrder ) {
        throw new ResourceNotFoundError( { type: 'Shopify order', id: orderId } );
      }

      for( let li of shopifyOrder.line_items ) {

        if( li.product_id && li.variant_id ) {

          const { product } = await shopifyAdmin.shopifyRest.getProduct( li.product_id );
          const { variant } = await shopifyAdmin.shopifyRest.getProductVariant( li.variant_id );

          const { metafields: productMetafields } = await shopifyAdmin.shopifyRest.getMetafieldsByOwnerIdAndType( li.product_id, 'products' );
          const { metafields: productVariantMetafields } = await shopifyAdmin.shopifyRest.getMetafieldsByOwnerIdAndType( li.variant_id, 'variants' );

          product.metafields = productMetafields;
          variant.metafields = productVariantMetafields;

          Object.assign( li, { product, variant });

        }

      }

      const data = {
        shopifyOrder,
        agentId: req.user._id
      };

      const claim = await claimsCommander.createClaim( data );

      eventsDb.createClaim( { user: req.user, claimId: claim._id } );

      res.json( { claim } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function startOrderItemClaim( req, res, next ) {

    try {

      const { claimId, orderItemId } = req.params;

      const claim = await claimsCommander.getClaimById( claimId, { populate: [ 'orderItems.lot' ] } );

      if( !claim ) {
        throw new ResourceNotFoundError( { type: 'Claim', id: claimId } );
      }

      const orderItem = await claim.getOrderItem( orderItemId );

      if( !orderItem ) {
        throw new ChildResourceNotFoundError( {
          parentType: 'claim',
          parentId: claimId,
          childType: 'order item',
          childId: orderItemId
        } );
      }

      let success = false;

      if( !orderItem.hasClaim() ) {

        await claim.startOrderItemClaim( orderItemId, req.user._id );

        if( orderItem.lot && orderItem.lot.manifestFileLocation  ) {

          // get customer email from Shopify order
          const { order: shopifyOrder } = await shopifyAdmin.shopifyRest.getOrder( claim.orderId );

          const { customer: { email: customerEmail } } = shopifyOrder;

          // get price paid from orderItem
          const { price, discounts } = orderItem;
          const purchasePrice = price - ( discounts ? discounts.reduce( ( total, _ ) => total + parseFloat(_.amount), 0 ) : 0);

          //  The usage of path.basename() is maybe a bit abusive since it's being applied to a URL instead of file path
          const filename = path.basename( orderItem.lot.manifestFileLocation );
          const title = path.basename( orderItem.lot.manifestFileLocation, '.xlsx' );

          const key = `${ orderItem.lot._id }/${ filename }`;

          const spreadsheetResp = await manifestSvc.exportToGoogle( key, title, customerEmail, purchasePrice );

          // record spreadsheetUrl in claim. mark claim.orderItem as having manifest created
          await claim.addOrderItemClaimManifest( orderItemId, spreadsheetResp );

        }

        eventsDb.startOrderItemClaim( { user: req.user, claimId, orderItemId } );

        success = true;

      }

      res.json( { success, claim, orderItem } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function deleteOrderItemClaim( req, res, next ) {

    try {

      const { claimId, orderItemId } = req.params;

      const claim = await claimsCommander.getClaimById( claimId, { populate: [ 'orderItems.lot' ] } );

      if( !claim ) {
        throw new ResourceNotFoundError( { type: 'Claim', id: claimId } );
      }

      const orderItem = await claim.getOrderItem( orderItemId );

      if( !orderItem ) {
        throw new ChildResourceNotFoundError( {
          parentType: 'claim',
          parentId: claimId,
          childType: 'order item',
          childId: orderItemId
        } );
      }

      if( orderItem.claim && orderItem.claim.manifest ) {

        await manifestSvc.deleteGoogleSpreadsheet( orderItem.claim.manifest.spreadsheetId );

      }

      await claim.deleteOrderItemClaim( orderItemId );

      eventsDb.deleteOrderItemClaim( { user: req.user, claimId, orderItemId } );

      res.json( { claim } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function setClaimIsClosed( req, res, next ) {

    try {

      const { isClosed } = req.body;

      if( typeof isClosed === 'boolean' ) {

        const { claimId } = req.params;

        if( isClosed ) {

          const { claim } = await claimsCommander.closeClaim( claimId );

          eventsDb.closeClaim( { user: req.user, claim } );

        }
        else {

          const { claim } = await claimsCommander.reopenClaim( claimId );

          eventsDb.reopenClaim( { user: req.user, claim } );

        }

        res.json( { success: true } );

      }
      else {
        throw new InvalidRequestError();
      }



    }
    catch(e) {
      return next(e);
    }

  }

  async function setClaimToBeReviewed( req, res, next ) {

    try {

      const { toBeReviewed } = req.body;

      if( typeof toBeReviewed === 'boolean' ) {

        const { claimId } = req.params;

        const { claim } = await claimsCommander.setClaimToBeReviewed( claimId, toBeReviewed );

        eventsDb.setClaimToBeReviewed( { user: req.user, claimId: claim._id, toBeReviewed } );

        res.json( { success: true } );

      }
      else {
        throw new InvalidRequestError();
      }

    }
    catch(e) {
      return next(e);
    }

  }

  async function updateOrderItemClaim( req, res, next ) {

    try {

      const { claimId, orderItemId } = req.params;

      const { claim, orderItem, edits } = await claimsCommander.editOrderItemClaim( claimId, orderItemId, req.body );


      if( claim && orderItem ) {

        for( let edit of edits ) {

          const eventData = Object.assign(
            {
              user: req.user,
              claimId,
              orderItemId
            },
            edit
          );

          eventsDb.editOrderItemClaim( eventData );

        }

      }

      res.json( { claim, orderItem, edits } );
    }
    catch(e) {
      return next(e);
    }
  }

  async function addClaimNote( req, res, next ) {

    try {

      const { claimId } = req.params;
      const { content } = req.body;

      const { claim } = await claimsCommander.addClaimNote( claimId, content, req.user );

      res.json( { claim } );
    }
    catch(e) {
      return next(e);
    }

  }

  async function setClaimTickets( req, res, next ) {

    try {

      const { claimId } = req.params;
      const { tickets } = req.body;

      const { claim } = await claimsCommander.setClaimTickets( claimId, tickets );

      res.json( { claim } );
    }
    catch(e) {
      return next(e);
    }

  }

  return router;
}
