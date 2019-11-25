import angular from 'angular';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('OrderPicklistController', [ 'api', 'OrderSvc', 'PicklistSvc', 'sessionTimeout', function(api, OrderSvc, PicklistSvc, sessionTimeout) {
  sessionTimeout.timeoutExpired();

  const vm = this;

  vm.order = {};

  function loadOrder() {
    OrderSvc.getOrder()
      .then(order => {
        console.log(order)
        vm.order = order;
      });
  }
  loadOrder();

}]);