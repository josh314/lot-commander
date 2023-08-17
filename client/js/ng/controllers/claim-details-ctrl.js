import angular from 'angular';

import * as util from '../../utilities';

/******************* Claim View Controller *************************/
angular.module('myApp').controller( 'ClaimDetailsCtrl', [

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

    function load() {
      return ClaimsSvc.get( { populate: [ 'orderItems.lot' ] , getShopifyOrder: true } ).then( claim => {
        console.log(claim)
        return vm.claim = claim;
      } );
    }

    function init() {

      const p = load().then( _ => {

        vm.startOrderItemClaim = startOrderItemClaim;
        vm.cancelOrderItemClaim = cancelOrderItemClaim;
        vm.navigate = navigate;
        vm.util = util;

      } );

      ModalSvc.wait( { waitFor: p } );

    }

    function reload() {
      return navigate.reload();
    }


    function startOrderItemClaim( orderItem ) {

      const p = orderItem.startClaim( );

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }


    function cancelOrderItemClaim( orderItem ) {

      const p = orderItem.cancelClaim( );

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }


  }

]);
