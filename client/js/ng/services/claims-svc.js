import angular from 'angular';

import * as api from '../../api';

/***************************************
 * Helpers
 * =======
 *
 ******/

const queryParams = ( { orderNumber, ticket, toBeReviewed, includeClosed, } ) => {

  const fp = {};

  if( includeClosed !== undefined ) {
    fp.include_closed = includeClosed ? 1 : 0;
  }

  if( toBeReviewed !== undefined ) {
    fp.to_be_reviewed = toBeReviewed ? 1 : 0;
  }

  if( orderNumber ) {
    fp.order_number = orderNumber;
  }

  if( ticket ) {
    fp.ticket = ticket;
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

    function _get( claimId, { populate, getShopifyOrder } = {} ) {

      return $q.when( api.getClaim( claimId, { populate, getShopifyOrder } ) ).then( resp => resp.claim );

    }

    return {

      lookupOrder: orderNumber => $q.when( api.lookupOrderForClaim( orderNumber ) ),

      get: ( { claimId, populate, getShopifyOrder, getManifestTotals } = {} ) => $q.when( _get( claimId || _claimId(), { populate, getShopifyOrder } ) ).then( _ => _ && new Claim( _, getManifestTotals ) ),

      startClaim: orderId => $q.when( api.startClaim( orderId ) ).then( resp => new Claim( resp.claim ) ),

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
  'ShopifyStoreConst',

  function(

    $q,
    ClaimOrderItem,
    ShopifyStoreConst,

  ) {

    class Claim {
      constructor( data, loadClaimManifestTotals ) {

        Object.assign(
          this,
          {
            claimId: data._id,
            orderId: data.orderId,
            orderUrl: `https://admin.shopify.com/store/${ ShopifyStoreConst.prod.name }/orders/${ data.orderId }`,
            orderNumber: `#${ data.orderNumber }`,
            orderDate: new Date( data.orderDate ),
            createdAt: new Date( data.createdAt ),
            toBeReviewed: data.toBeReviewed,
            isClosed: data.isClosed,
            orderItems: data.orderItems.map( _ => new ClaimOrderItem( this, _, loadClaimManifestTotals ) ),
            agent: data.agent,
            tickets: data.tickets,
            notes: data.notes.map( _ => ( {
              content: _.content,
              agent: _.agent,
              date: new Date( _.date ),
            } ) ),
          }
        );


        if( data.shopifyOrder && data.shopifyOrder.customer ) {

          this.customerId = data.shopifyOrder.customer.id;
          this.customerUrl = `https://admin.shopify.com/store/${ ShopifyStoreConst.prod.name }/customers/${ data.shopifyOrder.customer.id }`;

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


      delete( ) {
        return $q.when( api.deleteClaim( this.claimId ) );
      }

      addNote( content ) {
        return $q.when( api.addClaimNote( this.claimId, content ) );
      }

      editTickets( tickets ) {
        return $q.when( api.editClaimTickets( this.claimId, tickets ) );
      }

      startOrderItemClaim( orderItemId ) {
        return $q.when( api.startOrderItemClaim( this.claimId, orderItemId ) );
      }

      cancelOrderItemClaim( orderItemId ) {
        return $q.when( api.cancelOrderItemClaim( this.claimId, orderItemId ) );
      }

      updateOrderItemClaim( orderItemId, data ) {
        return $q.when( api.updateOrderItemClaim( this.claimId, orderItemId, data ) );
      }

      close() {
        return $q.when( api.closeClaim( this.claimId ) );
      }

      reopen() {
        return $q.when( api.reopenClaim( this.claimId ) );
      }

      setToBeReviewed( toBeReviewed ) {
        return $q.when( api.setClaimToBeReviewed( this.claimId, toBeReviewed ) );
      }

      toggleToBeReviewed() {
        return $q.when( api.setClaimToBeReviewed( this.claimId, !this.toBeReviewed ) );
      }

      suggestedRefund() {
        return this.orderItems.reduce( ( total, _orderItem ) => total + _orderItem.suggestedRefund(), 0);
      }

      totalPrice() {
        return this.orderItems.reduce( ( total, _orderItem ) => total + _orderItem.price, 0);
      }

      totalPricePaid() {
        return this.orderItems.reduce( ( total, _orderItem ) => total + _orderItem.pricePaid, 0);
      }

      totalDiscount() {
        return this.orderItems.reduce( ( total, _orderItem ) => total + _orderItem.totalDiscount, 0);
      }

    }

    return Claim;
  }
]);

/*********************** Claim Order Item class ********************/
angular.module('myApp').factory( 'ClaimOrderItem', [

  '$q',

  function( $q ) {

    class ClaimOrderItem {
      constructor( parent, data, loadClaimManifestTotals ) {

        this.parent = parent; // a Claim object

        const totalDiscount = data.discounts ? data.discounts.reduce( (total, _discount) => total + _discount.amount, 0 ) : 0;

        Object.assign(
          this,
          {
            orderItemId: data._id,
            sku: data.sku,
            price: data.price,
            pricePaid: data.price - totalDiscount,
            discounts: data.discounts,
            totalDiscount,
            productTitle: data.productTitle,
            units: parseInt( data.variantTitle ),
            claim: data.claim,
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

        this.resetClaimEdits();

        this.claimManifestTotalsLoaded = loadClaimManifestTotals && this.hasClaimManifest() ? this.loadClaimManifestTotals() : Promise.resolve(null);

      }

      hasClaimManifest() {
        return !!( this.claim && this.claim.manifest && this.claim.manifest.spreadsheetId );
      }

      hasClaim() {
        return !!( this.claim && this.claim.createdAt );
      }

      startClaim() {
        return this.parent.startOrderItemClaim( this.orderItemId );
      }

      cancelClaim() {
        return this.parent.cancelOrderItemClaim( this.orderItemId );
      }

      resetClaimEdits() {
        this.isEditingClaim = {};
        this.editClaimValue = {};
      }

      openClaimEdit( key ) {
        this.isEditingClaim[ key ] = true;
        this.editClaimValue[ key ] = this.claim[ key ];
      }

      closeClaimEdit( key ) {
        this.isEditingClaim[ key ] = false;
        delete this.editClaimValue[ key ];
      }

      saveClaimEdit( key ) {
        this.isEditingClaim[ key ] = false;
        let p; // will be set to a promise

        if( this.editClaimValue[ key ] !== this.claim[ key ] ) {

          p = this.updateClaim( { [ key ]: this.editClaimValue[ key ] } ).then( _ => this.claim[ key ] = this.editClaimValue[ key ] );

        }

        p = p || Promise.resolve( true ); // default placeholder promise if p is not defined above
        return p.then( _ => this.closeClaimEdit( key ) ); // close edit when done
      }

      updateClaim( data ) {
        return this.parent.updateOrderItemClaim( this.orderItemId, data );
      }

      claimUnits() {
        if( this.claim && this.claim.manifest ) {
          return this.claim.manifest.totalDefectiveUnits;
        }
        else if( this.claim && this.claim.units ) {
          return this.claim.units;
        }
      }

      suggestedRefund() {
        if( this.claim && this.claim.manifest ) {
          return this.claim.manifest.totalRefund;
        }
        else if( this.claim && this.claim.units ) {
          const unitCost = this.pricePaid / this.units;
          return unitCost * this.claim.units;
        }
        else return 0;
      }

      getClaimManifest() {

        let p;

        if( this.hasClaimManifest() ) {
          p = $q.when( api.getClaimManifest( this.claim.manifest.spreadsheetId ) );
        }
        else {
          p = Promise.resolve( null );
        }

        return p;

      }

      getClaimManifestTotals() {

        let p;

        if( this.hasClaimManifest() ) {
          p = $q.when( api.getClaimManifestTotals( this.claim.manifest.spreadsheetId ) );
        }
        else {
          p = Promise.resolve( null );
        }

        return p;

      }

      loadClaimManifestTotals() {

        this.getClaimManifestTotals().then( resp => {

          if( resp.error ) {

            this.claimManifestLoadError = true;

          }
          else {

            const totals = resp.googleManifestTotals;

            Object.assign( this.claim.manifest, totals );

          }

        } );

      }

    }

    return ClaimOrderItem;
  }
]);