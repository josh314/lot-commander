import 'angular';


angular.module('myApp').factory('PicklistSvc', [ '$localStorage', function($localStorage) {

  const statusEnum = {
    READY: 'ready',
    PICKING: 'picking',
    DONE: 'done'
  };

  const key = orderId => `order-${orderId}`;

  const svc = {
    statuses: statusEnum,
    get: get,
    store: store,
  };
  return svc;

  function get(orderId) {
    return $localStorage[key(orderId)];
  }

  function store(order) {
    if(order) {
      $localStorage[key(order.number)] = order;
      return order;
    }
  }

}]);