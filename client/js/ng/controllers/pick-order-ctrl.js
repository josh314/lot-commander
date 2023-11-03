import angular from 'angular';
import * as util from '../../utilities';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller( 'PickOrderController', [

  '$stateParams',
  'AudioAlertSvc',
  'focus',
  'ModalSvc',
  'OrderSvc',
  'sessionTimeout',

  function(

    $stateParams,
    AudioAlertSvc,
    focus,
    ModalSvc,
    OrderSvc,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();
      focus('ScanLabelInput');

      Object.assign(
        vm,
        {
          order: {},
          orderPick: {},

          scanLabel,
          manualPick,
          undoPick,

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

            AudioAlertSvc.success();

          }
          else {

            AudioAlertSvc.warning();
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

  }
]);