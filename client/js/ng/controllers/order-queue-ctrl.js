import angular from 'angular';

const __USER_SETTINGS_SUBKEY__ = 'order-queue-page';
const __DISPLAY_MODE_LIST__ = '__DISPLAY_MODE_LIST__';
const __DISPLAY_MODE_SUMMARY__ = '__DISPLAY_MODE_SUMMARY__';

angular.module('myApp').controller( 'OrderQueueCtrl', [

  'LoggedInUser',
  'OrderSvc',
  'sessionTimeout',
  'ShipmentManagerSvc',

  function(

    LoggedInUser,
    OrderSvc,
    sessionTimeout,
    ShipmentManagerSvc

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      vm.displayModes = {
        LIST: __DISPLAY_MODE_LIST__,
        SUMMARY: __DISPLAY_MODE_SUMMARY__,
      };
      vm.displayModeActive = vm.displayModes.SUMMARY;
      vm.displayModeActiveIs = str => str === vm.displayModeActive;
      vm.setDisplayModeActive = str => (vm.displayModeActive = str);

      vm.showPalletDetails = showPalletDetails;

      refreshQueue();
    }

    function refreshQueue() {
      OrderSvc.unfulfilledOrderQueue()
        .then( queue => {
          vm.queue = queue;
          console.log( 'Order queue:' );
          console.log( vm.queue );
        });
    }

    async function showPalletDetails( pallet ) {

      if( typeof pallet === 'string' ) {
        return;
      }

      if( LoggedInUser.hasPermission( 'VIEW_INCOMING_SHIPMENT' ) && pallet.shipment && !pallet.shipment.isHydrated ) {
        const shipment = await ShipmentManagerSvc.loadShipment( { shipmentId: pallet.shipment, populate: [ 'palletsReceived', 'palletsConsolidated' ]  } );
        pallet.shipment = shipment;

      }

      pallet.detailsModal();
    }

  }

]);