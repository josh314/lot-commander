import angular from 'angular';

const key = orderId => `order-${orderId}`;
const keyPattern = /^order-([0-9]*|undefined|null)$/;

class OrderCache {
  constructor($localStorage) {
    this.$localStorage = $localStorage;
  }

  get(orderId) {
    return this.$localStorage[key(orderId)];
  }

  store(order) {
    this.$localStorage[key(order.id)] = order;
    return order;
  }

  getAll() {
    return Object.entries(this.$localStorage).filter( x => x[0].match(keyPattern) );
  }

  reset(orderId) {
    delete this.$localStorage[key(orderId)];
  }

  resetAll() {
    for(let [ key, _ ] of this.getAll() ) {
      delete this.$localStorage[key];
    }
  }
}

angular.module('myApp').factory('OrderCache', [ '$localStorage', OrderCache ]);
