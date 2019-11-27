import angular from 'angular';

import successBeepWav from '../../audio/success.wav';
import failBeepWav from '../../audio/fail-2.wav';
const successBeep = new Audio(successBeepWav);
const failBeep = new Audio(failBeepWav);

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('OrderPicklistController', [ '$scope', 'OrderSvc', 'sessionTimeout', function($scope, OrderSvc, sessionTimeout) {
  sessionTimeout.timeoutExpired();

  const vm = this;
  vm.scanBarcode = scanBarcode;
  vm.order = {};

  (function init(){
    loadOrder()
      .catch(console.log);
  })();

  function loadOrder() {
    return OrderSvc.getOrder({ buildPicklist: true })
      .then(order => {
        vm.order = order;

        // Note: We seem to have to manually do a $digest cycle here but I don't quite get why
        $scope.$digest(); 

        return order;
      })
      .then(console.log);
  }

  function scanBarcode(barcode) {

  }

}]);