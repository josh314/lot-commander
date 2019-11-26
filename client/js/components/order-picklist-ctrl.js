import angular from 'angular';

import successBeepWav from '../../audio/success.wav';
import failBeepWav from '../../audio/fail-2.wav';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('OrderPicklistController', [ 'OrderSvc', 'sessionTimeout', function(OrderSvc, sessionTimeout) {
  sessionTimeout.timeoutExpired();

  const vm = this;
  vm.scanBarcode = scanBarcode;
  vm.refreshPicklist = refreshPicklist;

  vm.order = {};
  vm.items = [{ sku: 'foo' }];

  (function init(){
    loadOrder()
      .catch(console.log);
  })();

  function loadOrder() {
    return OrderSvc.getOrder()
      .then(order => {
        console.log(order);
        vm.order = order;
      });
  }

  function refreshPicklist() {
    OrderSvc.refreshPicklist(vm.order.id).then( picklist => {
      vm.order.picklist = picklist;
    })
  }

  function scan() {

  }

  const successBeep = new Audio(successBeepWav);
  const failBeep = new Audio(failBeepWav);
  function scanBarcode() {
    if (vm.scannedBarcode /* && $scope.scanForm.barcode.$valid */) {
      // const item = lotStore.addInventory($scope.scannedBarcode);
      // if(item) {
      //   if(item.quantity==1) {
      //     const resp = await $http.get(`/api/product-data/${item.barcode}`);
      //     if(resp && resp.data) {
      //       item.description = resp.data.title;
      //       item.price = resp.data.price;
      //       item.images = resp.data.images;
      //     }
      //   }
      //   successBeep.play();
      //   $state.reload();
      // }
      // else {
      //   failBeep.play();
      // }
    }
    else {
      failBeep.play();
    }
  }


}]);