import angular from 'angular';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('ListPendingOrdersController', [ 'api', 'PicklistSvc',  'sessionTimeout', function(api, PicklistSvc, sessionTimeout) {
  sessionTimeout.timeoutExpired();

  const vm = this;

  vm.orders = [];
  vm.page = 1;

  const stores = {
    374627: "Wholesale Ninjas",
    374389: "Bstock"
  };

  vm.updateOrderList = () => {
    api.getOrders(vm.page).then(orders => {
      if(orders) {
        console.log(orders)
        const ordersDisplay = orders.map( o => {
          const picklist = PicklistSvc.get(o.orderNumber);
          return {
            id: o.orderId,
            number: o.orderNumber,
            date: (new Date(o.orderDate)).toLocaleString(),
            status: picklist ? picklist.status : 'ready',
            marketplace: stores[o.advancedOptions.storeId]
          };
        });
        vm.orders = ordersDisplay;
      }
    });
  };
  vm.updateOrderList();

  vm.getNextPage = () => {
    vm.page += 1;
    vm.updateOrderList(); 
  };

}]);