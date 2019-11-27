import 'angular';

const key = orderId => `order-${orderId}`;
const keyPattern = /^order-([0-9]*|undefined|null)$/;

angular.module('myApp').factory('OrderCache', [ '$localStorage', function($localStorage) {

  return {
    get: get,
    getAll: getAll,
    reset: reset,
    resetAll: resetAll,
    store: store,
  };

  function get(orderId) {
    return $localStorage[key(orderId)];
  }

  function store(orderId, order) {
    $localStorage[key(orderId)] = order;
    return order;
  }

  function getAll() {
    return Object.entries($localStorage).filter( x => x[0].match(keyPattern) );
  }

  function reset(orderId) {
    //TODO
    delete $localStorage[key(orderId)];
  }

  function resetAll() {
    //TODO ???
    for(let [ key, _ ] of getAll() ) {
      delete $localStorage[key];
    }
  }

}]);
