import angular from 'angular';
import dayjs from 'dayjs';
import { prettifyDate } from '../../utilities';

const __USER_SETTINGS_SUBKEY__ = 'order-queue-page';
const __DISPLAY_MODE_LIST__ = '__DISPLAY_MODE_LIST__';
const __DISPLAY_MODE_SUMMARY__ = '__DISPLAY_MODE_SUMMARY__';

angular.module('myApp').controller( 'OrderQueueCtrl', [

  'LoggedInUser',
  'ModalSvc',
  'OrderSvc',
  'sessionTimeout',
  'ShipmentManagerSvc',

  function(

    LoggedInUser,
    ModalSvc,
    OrderSvc,
    sessionTimeout,
    ShipmentManagerSvc

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      vm.prettifyDate = prettifyDate;

      vm.displayModes = {
        LIST: __DISPLAY_MODE_LIST__,
        SUMMARY: __DISPLAY_MODE_SUMMARY__,
      };
      vm.displayModeActive = vm.displayModes.SUMMARY;
      vm.displayModeActiveIs = str => str === vm.displayModeActive;
      vm.setDisplayModeActive = str => (vm.displayModeActive = str);


      const filterOptions = [
        {
          id: null,
          label: 'All orders',
        },
        {
          id: '1-day',
          label: 'Older than 1 day',
          date: dayjs().subtract( 1, 'days' ).startOf().toDate()
        },
        {
          id: '3-days',
          label: 'Older than 3 days',
          date: dayjs().subtract( 3, 'days' ).startOf().toDate()
        },
        {
          id: '7-days',
          label: 'Older than 7 days',
          date: dayjs().subtract( 7, 'days' ).startOf().toDate()
        },
        {
          id: 'custom',
          label: 'Custom',
        }
      ];
      vm.inputs = {
        maxDate: new Date(),
        filter: filterOptions[0],
        filterOptions,
      };

      vm.processFilterInput = function() {

        if( vm.inputs.filter.id !== 'custom' ) {
          vm.inputs.endDate = vm.inputs.filter.date;
          refreshQueue();
        }
      };

      vm.showPalletDetails = showPalletDetails;

      vm.refreshQueue = refreshQueue;

      refreshQueue();
    }

    function refreshQueue() {

      const startDate = vm.inputs.startDate;
      const endDate = vm.inputs.endDate;

      const p = OrderSvc.unfulfilledOrderQueue( startDate, endDate )
        .then( queue => {
          vm.queue = queue;
          console.log( 'Order queue:' );
          console.log( vm.queue );
        });

      return ModalSvc.wait( {
        waitFor: p
      } );
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