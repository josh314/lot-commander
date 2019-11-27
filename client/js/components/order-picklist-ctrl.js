import angular from 'angular';

import successBeepWav from '../../audio/success.wav';
import failBeepWav from '../../audio/fail-2.wav';
const successBeep = new Audio(successBeepWav);
const failBeep = new Audio(failBeepWav);

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('OrderPicklistController', [ '$scope', 'OrderSvc', 'PrintSvc', 'sessionTimeout', function($scope, OrderSvc, PrintSvc, sessionTimeout) {
  sessionTimeout.timeoutExpired();

  const vm = this;
  vm.order = {};

  const methods = {
    scanBarcode: scanBarcode,
    markAsPicked: markAsPicked,
    printPickReceipt: printPickReceipt,
  }
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
        $scope.$digest();

        return order;
      })
      .then(console.log);
  }

  function scanBarcode() {
    const barcode = vm.barcode
    if(barcode) {
      if(vm.order.pickItem(barcode)) {
        // TODO: store in cache
        successBeep.play();
        OrderSvc.cache.store(vm.order); 
      }
      else {
        failBeep.play();
      }
      vm.barcode = '';
    }
  }

  function markAsPicked(pickItemIndex) {
    vm.order.markItemAsPicked(pickItemIndex);
    OrderSvc.cache.store(vm.order); 
  }

  function printPickReceipt() {
    PrintSvc.printPickReceipt(vm.order.number);
  }

}]);