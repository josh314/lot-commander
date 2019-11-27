import angular from 'angular';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('ListPendingOrdersController', [ 'OrderSvc',  'sessionTimeout', function(OrderSvc, sessionTimeout) {
  sessionTimeout.timeoutExpired();

  const vm = this;

  vm.orders = [];
  vm.page = 1;

  vm.updateOrderList = () => {
    OrderSvc.getPendingOrdersList(vm.page).then(orders => {
      if(orders) {
        console.log(orders)
        vm.orders = orders;
      }
    });
  };
  vm.updateOrderList();

  vm.getNextPage = () => {
    vm.page += 1;
    vm.updateOrderList(); 
  };

}]);