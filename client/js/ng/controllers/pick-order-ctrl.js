import angular from 'angular';
import * as util from '../../utilities';
import * as audioAlerts from '../../audio-alerts';
import * as print from '../../print';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller( 'PickOrderController', [

  '$stateParams',
  'focus',
  'ModalSvc',
  'navigate',
  'OrderSvc',

  function(

    $stateParams,
    focus,
    ModalSvc,
    navigate,
    OrderSvc,

  ) {

    const vm = this;
    init();

    function init() {

      focus('ScanLabelInput');

      Object.assign(
        vm,
        {
          order: {},
          orderPick: {},

          scanLabel,
          manualPick,
          undoPick,
          goToLotPage,
          goToOrderQueue,
          printLabels,

          // expose modules to view

          util,

        }
      );

      startOrderPick();

    }


    function startOrderPick() {
      return OrderSvc.startOrderPick( $stateParams.orderId )
        .then(order => {
          vm.order = order;
          vm.orderPick = order.orderPick;
          return order;
        })
        .then(console.log);
    }

    function scanLabel( ) {

      if( vm.label ) {

        vm.orderPick.pickByLabel( vm.label ).then( ( { pickItem, error } ) => {

          if( pickItem && !error ) {

            audioAlerts.success();

          }
          else {

            audioAlerts.warning();
            ModalSvc.message( {
              header: 'Error',
              body: error,
              type: 'error',
            } );

          }

        });

      }

      vm.label = '';

    }

    function manualPick( pickItem ) {

      return pickItem.manualPick();

    }

    function undoPick( pickItem ) {

      return pickItem.undoPick();

    }

    function goToLotPage( lot ) {

      const lotId = typeof lot === 'string' ? lot : lot._id;
      navigate.viewLot( lotId );

    }

    function goToOrderQueue() {
      navigate.orderQueue();
    }

    async function printLabels() {

      let shouldPrint = true;

      if( !vm.orderPick.allItemsPicked() ) {

        shouldPrint = await ModalSvc.confirm( {
          header: 'Print Labels',
          body: 'Picking for this order is not complete. Are you sure you want to print labels now?'
        } );

      }

      if( shouldPrint ) {

        print.printOrderLabels( vm.order._id );

      }

    }

  }
]);