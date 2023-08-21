import angular from 'angular';

import * as util from '../../utilities';


class DisplayOrder {

  constructor( shopifyOrder ) {

    Object.assign(
      this,
      {
        orderId: shopifyOrder.id,
        orderNumber: shopifyOrder.order_number,
        orderDate: new Date( shopifyOrder.created_at ),
        totalPrice: parseFloat( shopifyOrder.total_price ), //TODO: is this the price paid ?
        lineItems: shopifyOrder.line_items.map( ({ id, name, quantity }) => ({ lineItemId: id, name, quantity, }) ),
        claim: shopifyOrder.claim
      }
    );

    if( shopifyOrder.customer.first_name && shopifyOrder.customer.last_name ) {
      this.customerName = shopifyOrder.customer.first_name + ' ' + shopifyOrder.customer.last_name;
    }
    else if ( shopifyOrder.customer.first_name ) {
      this.customerName = shopifyOrder.customer.first_name;
    }
    else if ( shopifyOrder.customer.last_name ) {
      this.customerName = shopifyOrder.customer.last_name;
    }
    else {
      this.customerName = '';
    }

    this.customerEmail = shopifyOrder.customer.email;

  }

}

/******************* Claim Start Controller *************************/
angular.module('myApp').controller( 'ClaimNewCtrl', [

  'ClaimsSvc',
  'ModalSvc',
  'navigate',

  function(

    ClaimsSvc,
    ModalSvc,
    navigate

  ) {

    const vm = this;
    init();

    function init() {
      Object.assign(
        vm,
        {
          // vars
          orderNumber: '',
          orders: null,
          selectedOrder: null

        },
        {
          // modules
          navigate,
          util,

          // functions
          lookupOrder,
          selectOrder,
          startClaim,
          unselectOrder

        }
      );

    }

    function lookupOrder( ) {

      vm.orders = null;
      vm.selectedOrder = null;

      ClaimsSvc.lookupOrder( vm.orderNumber ).then( resp => {

        if( resp.claim ) {
          navigate.claimDetails( resp.claim._id );
        }
        else if ( resp.orders ) {

          vm.orders = resp.orders.map( _ => new DisplayOrder(_) );

          if( vm.orders.length === 1 ) {
            vm.selectedOrder = vm.orders[0];
          }

        }

      });
    }

    function selectOrder( order ) {
      vm.selectedOrder = order;
    }

    function unselectOrder() {
      vm.selectedOrder = null;
    }

    function startClaim( ) {

      if( vm.selectedOrder ) {

        const { orderId } = vm.selectedOrder;

        const p = ClaimsSvc.startClaim( orderId );

        return ModalSvc.wait( { waitFor: p } ).then( claim => {
          navigate.claimDetails( claim.claimId );
        } );

      }
    }

  }
]);