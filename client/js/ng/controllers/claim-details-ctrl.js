import angular from 'angular';

import * as util from '../../utilities';

/******************* Claim View Controller *************************/
angular.module('myApp').controller( 'ClaimDetailsCtrl', [

  'ClaimsSvc',
  'LoggedInUser',
  'ModalSvc',
  'navigate',

  function(

    ClaimsSvc,
    LoggedInUser,
    ModalSvc,
    navigate

  ) {

    const vm = this;
    init();

    function load() {
      return ClaimsSvc.get( { populate: [ 'orderItems.lot', 'agent', 'notes.agent' ] , getShopifyOrder: true, getManifestTotals: true } ).then( claim => {

        if( !claim ) {
          navigate.claimList();
        }

        console.log(claim);
        return vm.claim = claim;
      } );
    }

    function init() {

      const p = load().then( _ => {

        Object.assign(
          vm,
          {
            //vars
            showDeveloper: LoggedInUser.isDeveloper(),
            showEditControls: LoggedInUser.hasPermission( 'EDIT_CLAIM' ),
            showCloseClaimControls: LoggedInUser.hasPermission( 'CLOSE_CLAIM' ),
            showShopifyLinks: LoggedInUser.hasPermission( 'VIEW_SHOPIFY_ORDER' ),
            inputs: {
              newNote: '',
              ticketsEditing: false,
              tickets: vm.claim.tickets.map( _ => _.id ).join(','),
            },

            //modules
            navigate,
            util,

            //functions
            startTicketsEditing,
            cancelTicketsEditing,
            saveTicketsEditing,
            addClaimNote,
            startOrderItemClaim,
            cancelOrderItemClaim,
            saveOrderItemClaim,
            deleteClaim,
            closeClaim,
            reopenClaim,
            toggleClaimToBeReviewed
          }
        );

      } );

      ModalSvc.wait( { waitFor: p } );

    }

    function reload() {
      return navigate.reload();
    }

    function addClaimNote() {
      return vm.claim.addNote( vm.inputs.newNote ).then( reload );
    }

    // function beginClaimTicketsEdit() {
    //   vm.inputs.ticketsEditing = true;
    // }

    function startTicketsEditing() {
      vm.inputs.tickets = vm.claim.tickets.map( _ => _.ticketId ).join(',');
      vm.inputs.ticketsEditing = true;
    }

    function cancelTicketsEditing() {
      vm.inputs.ticketsEditing = false;
      vm.inputs.tickets = [];
    }

    function saveTicketsEditing() {

      vm.inputs.ticketsEditing = false;

      // split by commas, trim extra whitespace, remove empties
      const ticketsToSave = vm.inputs.tickets.split(',').map( _ => _.trim() ).filter( _ => _ );

      return vm.claim.editTickets( ticketsToSave ).then( reload );
    }

    function startOrderItemClaim( orderItem ) {

      const p = orderItem.startClaim( );

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }


    function cancelOrderItemClaim( orderItem ) {

      const p = orderItem.cancelClaim( );

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }

    function saveOrderItemClaim( orderItem, key ) {

      const p = orderItem.saveClaimEdit( key );

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }


    function deleteClaim( ) {

      const p = vm.claim.delete( );

      ModalSvc.wait( { waitFor: p } ).then( () => navigate.claimList() );

    }

    function closeClaim( ) {

      const p = vm.claim.close( );

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }

    function reopenClaim( ) {

      const p = vm.claim.reopen( );

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }

    function toggleClaimToBeReviewed() {

      const p = vm.claim.toggleToBeReviewed();

      ModalSvc.wait( { waitFor: p } ).then( reload );

    }

  }

]);
