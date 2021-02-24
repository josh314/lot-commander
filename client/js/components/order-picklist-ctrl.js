import angular from 'angular';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('OrderPicklistController', [ '$scope', 'AudioAlertSvc', 'focus', 'OrderSvc', 'PrintSvc', 'sessionTimeout',
  function($scope, AudioAlertSvc, focus, OrderSvc, PrintSvc, sessionTimeout) {
    sessionTimeout.timeoutExpired();
    focus('PickItemScanInput');

    const vm = this;
    vm.order = {};
    vm.showInstructions = false;

    const methods = {
      scanBarcode: scanBarcode,
      markAsPicked: markAsPicked,
      printPickReceipt: printPickReceipt,
      refreshOrder: refreshOrder,
      toggleShowInstructions: toggleShowInstructions,
    };
    Object.assign(vm, methods);


    (function init(){
      loadOrder()
        .catch(console.log);
    })();

    function loadOrder() {
      return OrderSvc.getOrder({ buildPicklist: true })
        .then(order => {
          vm.order = order;

          // Note: We seem to have to manually do a $digest cycle here but I don't quite get why
          // TODO: getting error about $digest already in progress (only when not getting order from cache?)
          // $scope.$digest();

          return order;
        })
        .then(console.log);
    }

    function scanBarcode() {
      const barcode = vm.barcode;
      if(barcode) {
        if(vm.order.pickItem(barcode)) {
          // TODO: store in cache
          AudioAlertSvc.success();
          OrderSvc.cache.store(vm.order); 
        }
        else {
          AudioAlertSvc.fail();
        }
        vm.barcode = '';
      }
    }

    function markAsPicked(pickItemIndex) {
      vm.order.markItemAsPicked(pickItemIndex);
      OrderSvc.cache.store(vm.order); 
    }

    function printPickReceipt() {
      PrintSvc.printPickReceipt(vm.order.id);
    }

    function refreshOrder() {
      OrderSvc.refreshOrder(vm.order.id).then(order=>{
        vm.order = order;
      });
    }

    function toggleShowInstructions() {
      vm.showInstructions = !vm.showInstructions;
    }

  }
]);