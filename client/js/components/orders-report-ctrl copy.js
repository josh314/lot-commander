import angular from 'angular';

import * as moment from 'moment';
import * as api from '../api';

/******************* Orders Report Page Controller *************************/
angular.module('myApp').controller('OrdersReportCtrl', [ '$q', '$timeout', 'sessionTimeout',
  function($q, $timeout, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.orderList = {
      orders: []
    };

    vm.inputs = {
      startDate: moment().startOf('day').toDate(),
      endDate: moment().endOf('day').toDate(),
      minDate: moment('2017-12-01').format('YYYY-MM-DD'),// Wholesale Ninjas first actual orders start in this month
      maxDate: moment().format('YYYY-MM-DD'),
    };

    function loadOrders(startDate, endDate, cursor) {
      return $q.when( api.getOrderReport( startDate.toISOString(), endDate.toISOString(), cursor ) ).then( resp => {
        console.log(resp);
        vm.orderList.orders = vm.orderList.orders.concat(resp.orders);

        if( resp.hasNextPage && resp.cursor ) {
          const costDifference = 500 - resp.availableCost;
          const waitInSeconds = Math.ceil( costDifference / 50 );
          return $timeout( () => { return loadOrders( startDate, endDate, resp.cursor ); }, waitInSeconds * 1000 );
        }
        else {
          vm.orderList.orders.sort( (a,b) => a.date > b.date ? 1 : -1 );
        }
      });
    }

    function loadOrdersForInputDateRange() {

      let startDate = vm.inputs.startDate;
      let endDate = vm.inputs.endDate;

      let orderPromise;

      // TODO: we are assuming that startDate <= endDate. Can user error fuck things up royally?

      // TODO: make sure the startOf/endOf day mechanics work out, especially when setting an enddate from a startDate or vice versa

      if( !vm.orderList.startDate || !vm.orderList.endDate ) {
        console.log('Initial loading of order list');
        // Set the orderList dates to be input dates
        orderPromise = loadOrders( startDate, endDate ).then( _ => {
          vm.orderList.startDate = startDate;
          vm.orderList.endDate = endDate;
        });
      }
      else if( startDate < vm.orderList.startDate && endDate < vm.orderList.startDate ) {
        console.log('New date interval is entirely before the old interval. ');
        // Extend the order list to encompass both by requesting all orders from the start of the new interval until the start of the old interval
        // Set the orderList start date to be the input start date
        orderPromise = loadOrders( startDate, vm.orderList.startDate ).then( _ => {
          vm.orderList.startDate = startDate;
        });
      }
      else if( startDate < vm.orderList.startDate && endDate >= vm.orderList.startDate && endDate <= vm.orderList.endDate ) {
        console.log('New interval starts before the old one and ends in the middle of the old one');
        // Extend the order list to encompass both by requesting all orders from the start of the new interval until the start of the old interval
        // Set the orderList start date to be the input start date
        orderPromise = loadOrders( startDate, vm.orderList.startDate ).then( _ => {
          vm.orderList.startDate = startDate;
        });
      }
      else if( startDate < vm.orderList.startDate && endDate > vm.orderList.endDate ) {
        console.log('New interval starts before the old and ends after the old');
        // Extend the order list in both directions by getting orders in two separate batches: one for the orders before the old list, and one for orders after the old list
        // Set both the orderList's start and end dates to the input dates
        orderPromise = Promise.all([
          loadOrders( startDate, vm.orderList.startDate ),
          loadOrders( vm.orderList.endDate, endDate )
        ]).then( _ => {
          vm.orderList.startDate = startDate;
          vm.orderList.endDate = endDate;
        });
      }
      else if( startDate >= vm.orderList.startDate && endDate <= vm.orderList.endDate ) {
        console.log('New interval is a subinterval of the old ');
        // No new data needed, so make a dummy promise
        orderPromise = Promise.resolve(null);
      }
      else if( startDate >= vm.orderList.startDate && endDate > vm.orderList.endDate ) {
        console.log('New interval starts within the old and ends past the old');
        // Extend the order list to encompass both by requesting all orders from the end of the old interval until the end of the new interval
        // Set the orderList end date to be the input end date
        orderPromise = loadOrders( vm.orderList.endDate, endDate ).then( _ => {
          vm.orderList.endDate = endDate;
        });
      }
      else if( startDate > vm.orderList.endDate ) {
        console.log('New interval is entirely after the old');
        // Extend the order list to encompass both by requesting all orders from the end of the old interval until the end of the new interval
        // Set the orderList end date to be the input end date
        orderPromise = loadOrders( vm.orderList.endDate, endDate ).then( _ => {
          vm.orderList.endDate = endDate;
        });
      }

      $q.when( orderPromise ).then( _ => { 
        vm.orderList.orders.sort( (a,b) => a.date > b.date ? 1 : -1 );
        console.log(vm.orderList);
      });
    }
    vm.loadOrdersForInputDateRange = loadOrdersForInputDateRange;

  }]
);