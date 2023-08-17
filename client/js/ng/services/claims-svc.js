import angular from 'angular';

import * as api from '../../api';

/***************************************
 * Helpers
 * =======
 *
 ******/

const queryParams = ( params ) => {

  const fp = {};

  if( "includeClosed" in params ) {
    if( params.includeClosed !== null ) {
      fp.include_closed = params.includeClosed ? 1 : 0;
    }
  }

  if( params.orderNumber ) {
    fp.order_number = params.orderNumber;
  }

  return fp;
};

/******************* Service for managing claims ***/
angular.module('myApp').factory( 'ClaimsSvc', [

  '$q',
  '$stateParams',
  'Claim',

  function (

    $q,
    $stateParams,
    Claim,

  ) {

    const _claimId = () =>  $stateParams.claimId;

    async function _get( claimId, { populate, getShopifyOrder } = {} ) {

      const { claim, shopifyOrder } = await $q.when( api.getClaim( claimId, { populate, getShopifyOrder } ) );

      if( shopifyOrder ) {
        claim.shopifyOrder = shopifyOrder;
      }

      return claim;

    }


    return {

      get: ( { claimId, populate, getShopifyOrder } = {} ) => $q.when( _get( claimId || _claimId(), { populate, getShopifyOrder } ) ).then( _ => new Claim(_) ),

      startOrderItemClaim: ( { claimId, orderItemId } ) =>  $q.when( api.startOrderItemClaim( claimId || _claimId(), orderItemId ) ),

      cancelOrderItemClaim: ( { claimId, orderItemId } ) =>  $q.when( api.cancelOrderItemClaim( claimId || _claimId(), orderItemId ) ),

      list: ( { filter, sort, num, page } ) => {

        const query = {
          num,
          page
        };

        Object.assign( query, queryParams(filter) );

        if( sort.key ) {
          query.sort = sort.key;
          query.sort_dir = sort.ascending ? 1 : -1;
        }

        return $q.when( api.listClaims( query ) ).then( claims => claims.map( _ => new Claim( _ ) ));
      },

      count: filter => $q.when( api.countClaims( queryParams( filter ) ) ),

    };

  }

]);


/*********************** Claim class ********************/
angular.module('myApp').factory( 'Claim', [

  '$q',
  'ClaimOrderItem',

  function(

    $q,
    ClaimOrderItem,

  ) {

    class Claim {
      constructor( data ) {

        this.claimId = data._id;
        this.orderId = data.orderId;
        this.orderNumber = `#${ data.orderNumber }`;
        this.orderDate = new Date( data.orderDate );
        this.createdAt = new Date( data.createdAt );
        this.totalPricePaid = data.totalPricePaid;
        this.totalPrice = data.totalPrice;
        this.orderItems = data.orderItems.map( _ => new ClaimOrderItem( this, _ ) );

        if( data.shopifyOrder ) {

          if( data.shopifyOrder.customer.first_name && data.shopifyOrder.customer.last_name ) {
            this.customerName = data.shopifyOrder.customer.first_name + ' ' + data.shopifyOrder.customer.last_name;
          }
          else if ( data.shopifyOrder.customer.first_name ) {
            this.customerName = data.shopifyOrder.customer.first_name;
          }
          else if ( data.shopifyOrder.customer.last_name ) {
            this.customerName = data.shopifyOrder.customer.last_name;
          }
          else {
            this.customerName = '';
          }

          this.customerEmail = data.shopifyOrder.customer.email;

        }

      }

      startOrderItemClaim( orderItemId ) {
        return $q.when( api.startOrderItemClaim( this.claimId, orderItemId ) );
      }

      cancelOrderItemClaim( orderItemId ) {
        return $q.when( api.cancelOrderItemClaim( this.claimId, orderItemId ) );
      }

    }

    return Claim;
  }
]);

/*********************** Claim Order Item class ********************/
angular.module('myApp').factory( 'ClaimOrderItem', [

  '$q',

  function(

    $q,

  ) {

    class ClaimOrderItem {
      constructor( claim, data ) {

        this.claim = claim;

        Object.assign(
          this,
          {
            orderItemId: data._id,
            sku: data.sku,
            pricePaid: data.pricePaid,
            price: data.price,
            productTitle: data.productTitle,
            units: parseInt( data.variantTitle ),
            hasClaim: !!( data.claim && data.claim.createdAt )
          }
        );

        if( data.lot ) {

          Object.assign(
            this,
            {
              lotId: data.lot._id,
              lotHandle: data.lot.handle,
              manifestUrl: data.lot.manifestFileLocation
            }
          );

        }

        if( this.hasClaim && data.claim.manifest ) {
          this.claimManifestUrl = data.claim.manifest.spreadsheetUrl;
        }

      }

      startClaim() {
        return this.claim.startOrderItemClaim( this.orderItemId );
      }

      cancelClaim() {
        return this.claim.cancelOrderItemClaim( this.orderItemId );
      }

    }

    return ClaimOrderItem;
  }
]);