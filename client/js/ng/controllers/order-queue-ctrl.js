import angular from 'angular';
import dayjs from 'dayjs';
import { prettifyDate } from '../../utilities';

const __DISPLAY_MODE_LINE_ITEMS__ = '__DISPLAY_MODE_LINE_ITEMS__';
const __DISPLAY_MODE_SUMMARY__ = '__DISPLAY_MODE_SUMMARY__';

const __DISPLAY_MODES__ = {
  ORDER_QUEUE: __DISPLAY_MODE_LINE_ITEMS__,
  LINE_ITEMS: __DISPLAY_MODE_LINE_ITEMS__,
  SUMMARY: __DISPLAY_MODE_SUMMARY__,
};

const __FILTER_OPTIONS__ = [
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

angular.module('myApp').controller( 'OrderQueueCtrl', [

  'LoggedInUser',
  'ModalSvc',
  'navigate',
  'OrderSvc',
  'sessionTimeout',
  'ShipmentManagerSvc',

  function(

    LoggedInUser,
    ModalSvc,
    navigate,
    OrderSvc,
    sessionTimeout,
    ShipmentManagerSvc

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      Object.assign(
        vm,
        {
          // data
          inputs: {
            maxDate: new Date(),
            filter: __FILTER_OPTIONS__[0],
            filterOptions: __FILTER_OPTIONS__,
          },
          displayModes: __DISPLAY_MODES__,
          displayModeActive: __DISPLAY_MODES__.ORDER_QUEUE,

          // methods

          displayModeActiveIs: str => str === vm.displayModeActive,
          setDisplayModeActive: str => (vm.displayModeActive = str),

          goToPickOrderPage,
          prettifyDate,
          processFilterInput,
          showPalletDetails,
          refreshQueue,
          reopenOrderPick,

        }
      );

      return OrderSvc.init().then( refreshQueue );

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

    function processFilterInput() {

      if( vm.inputs.filter.id !== 'custom' ) {
        vm.inputs.endDate = vm.inputs.filter.date;
        refreshQueue();
      }
    }

    function goToPickOrderPage( order ) {
      return navigate.pickOrder( order._id );
    }

    function reopenOrderPick( order ) {
      return order.orderPick.unfinish();
    }

  }

]);