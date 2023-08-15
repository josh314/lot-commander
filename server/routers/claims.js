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

  if( qp.order_number ) {
    fp.orderNumber = new RegExp( qp.order_number, 'i');
  }


  return fp;
};

function getGoogleManifestTotals( manifest ) {

  const res = {};

  const data = manifest.sheets[0].data;

  for( let _namedRange of manifest.namedRanges ) {

    const _namedRangeData = data.find( _ => _.startColumn === _namedRange.range.startColumnIndex );

    res[ _namedRange.name ] = parseFloat( _namedRangeData.rowData[0].values[0].effectiveValue.numberValue );

  }

  return res;
}


/**********************************************
 * Router
 * =======
 *
 *********/

function routes( { claimsCommander, manifestSvc, shopifyAdmin } ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  // TODO: add user authorizations

  /*******  GET  *********/

  // list claim(s)
  router.get(
    '/',
    // auth.isAuthorized( 'LIST_CLAIMS' ), TODO: auth
    listClaims
  );
  router.get(
    '/count',
    // auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ), TODO: auth
    countClaims
  );
  router.get(
    '/:claimId',
    // auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ), TODO: auth
    getClaimById
  );

  router.get(
    '/:claimId/shopify-order',
    // auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ), TODO: auth
    getClaimShopifyOrder
  );

  // get an order so as to start a claim
  router.get(
    '/orders/:orderNumber',
    // auth.isAuthorized TODO: auth
    getOrderForClaim
  );


  /*******  DELETE  *********/

  router.delete(
    '/:claimId',
    // auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ), TODO: auth
    deleteClaim
  );

  router.delete(
    '/:claimId/order-items/:orderItemId/claim',
    // TODO: auth
    deleteOrderItemClaim
  );

  /*******  POST  *********/

  router.post(
    '/',
    // TODO: auth
    startClaim
  );

  /*******  PUT  *********/

  router.put(
    '/:claimId/is-closed',
    // TODO: auth
    editClaimIsClosed
  );

  router.put(
    '/:claimId/order-items/:orderItemId/claim',
    // TODO: auth
    startOrderItemClaim
  );


  /*******  PATCH  *********/

  router.patch(
    '/:claimId/order-items/:orderItemId/claim/',
    // TODO: auth
    updateOrderItemClaim
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
      const getManifestTotals = !!parseInt( req.query.manifest_totals );

      const claim = await claimsCommander.getClaimById( claimId, { populate } );

      let shopifyOrder;
      if( getShopifyOrder ) {

        const { order } = await shopifyAdmin.shopifyRest.getOrder( claim.orderId );
        shopifyOrder = order;

      }

      if( getManifestTotals ) {

        for( let _orderItem of claim.orderItems ) {

          if( _orderItem.claim && _orderItem.claim.manifest && _orderItem.claim.manifest.spreadsheetId ) {

            const googleManifest = await manifestSvc.getGoogleSpreadsheet( _orderItem.claim.manifest.spreadsheetId, true /* namedRangesOnly */ );
            const manifestTotals = getGoogleManifestTotals( googleManifest );

            Object.assign(
              _orderItem.claim.manifest,
              manifestTotals
            );

            // require('fs').writeFileSync( 'google-manifest.json', JSON.stringify(googleManifest,null,2), 'utf-8' )

          }

        }

      }

      res.json( { claim: claim.toObject( { virtuals: true } ), shopifyOrder } );
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

          if( orderItem.claim.manifest.spreadsheetId ) {

            await manifestSvc.deleteGoogleSpreadsheet( orderItem.claim.manifest.spreadsheetId );

          }

          await claim.deleteOrderItemClaim( orderItem._id );

        }

      }

      await claimsCommander.deleteClaim( claimId );

      res.json( { success: true } );
    }
    catch(e) {
      return next( e );
    }

  }


  async function getOrderForClaim( req, res, next ) {

    try {

      const { orderNumber } = req.params;

      // check if a claim has already been started
      const claim = await claimsCommander.findClaimByOrderNumber( orderNumber );

      if( claim ) {
        res.json( { claim } ); // TODO: is this the right behavior? returning a claim, but the function/endpoint is for getting orders
      }

      const { orders } = await shopifyAdmin.shopifyRest.listOrders( { name: orderNumber } );

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

        const { product } = await shopifyAdmin.shopifyRest.getProduct( li.product_id );
        const { variant } = await shopifyAdmin.shopifyRest.getProductVariant( li.variant_id );

        const { metafields: productMetafields } = await shopifyAdmin.shopifyRest.getMetafieldsByOwnerIdAndType( li.product_id, 'products' );
        const { metafields: productVariantMetafields } = await shopifyAdmin.shopifyRest.getMetafieldsByOwnerIdAndType( li.variant_id, 'variants' );

        product.metafields = productMetafields;
        variant.metafields = productVariantMetafields;

        Object.assign( li, { product, variant });

      }

      const data = {
        shopifyOrder,
        agentId: req.user._id
      };

      const claim = await claimsCommander.createClaim( data );

      // eventsDb.createClaim( { user: req.user, claim } );

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

      const orderItem = await claim.startOrderItemClaim( orderItemId, req.user._id );

      if( !orderItem ) {
        throw new ChildResourceNotFoundError( {
          parentType: 'claim',
          parentId: claimId,
          childType: 'order item',
          childId: orderItemId
        } );
      }

      // TODO: only proceed if claim was newly made

      if( orderItem.lot && orderItem.lot.manifestFileLocation  ) {

        // get customer email from Shopify order
        const { order: shopifyOrder } = await shopifyAdmin.shopifyRest.getOrder( claim.orderId );

        const { customer: { email: customerEmail } } = shopifyOrder;

        // get pricePaid from orderItem
        const { pricePaid: purchasePrice } = orderItem;

        //  The usage of path.basename() is maybe a bit abusive since it's being applied to a URL instead of file path
        const filename = path.basename( orderItem.lot.manifestFileLocation );
        const title = path.basename( orderItem.lot.manifestFileLocation, '.xlsx' );

        const key = `${ orderItem.lot._id }/${ filename }`;

        const spreadsheetResp = await manifestSvc.exportToGoogle( key, title, customerEmail, purchasePrice );

        // record spreadsheetUrl in claim. mark claim.orderItem as having manifest created
        await claim.addOrderItemClaimManifest( orderItemId, spreadsheetResp );

      }

      res.json( { claim } );
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

      res.json( { claim } );

    }
    catch(e) {
      return next(e);
    }

  }

  async function editClaimIsClosed( req, res, next ) {

    try {

      const { isClosed } = req.body;

      if( typeof isClosed === 'boolean' ) {

        const { claimId } = req.params;

        if( isClosed ) {

          const { claim } = await claimsCommander.closeClaim( claimId );

          // eventsDb.closeClaim( { user: req.user, claim } );

        }
        else {

          const { claim } = await claimsCommander.reopenClaim( claimId );

          // eventsDb.reopenClaim( { user: req.user, claim } );

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

  async function updateOrderItemClaim( req, res, next ) {

    try {

      const { claimId, orderItemId } = req.params;
      const { units } = req.body;

      const { claim, edits } = await claimsCommander.updateOrderItemClaimUnits( claimId, orderItemId, units );

      // if( claim ) {

      //   for( let edit of edits ) {

      //     const eventData = Object.assign(
      //       {
      //         user: req.user,
      //         claimId,
      //       },
      //       edit
      //     );

      //     eventsDb.editClaim( eventData );

      //   }

      // }

      res.json( { success: true } );
    }
    catch(e) {
      return next(e);
    }
  }

  return router;
}
