import angular from 'angular';

import * as api from '../api';

/******************* Lot List Page Controller *************************/
angular.module('myApp').service('RangedOrderList', [ '$q', '$timeout', 
  function($q, $timeout) {
    const svc = this;

    const orderList = {
      orders: []
    };

    svc.get = () => orderList;

    function loadOrders(startDate, endDate, cursor) {
      return $q.when( api.getOrderReport( startDate.toISOString(), endDate.toISOString(), cursor ) ).then( resp => {
        console.log(resp);
        orderList.orders = orderList.orders.concat(resp.orders);

        if( resp.hasNextPage && resp.cursor ) {
          const costDifference = 500 - resp.availableCost;
          const waitInSeconds = Math.ceil( costDifference / 50 );
          return $timeout( () => { return loadOrders( startDate, endDate, resp.cursor ); }, waitInSeconds * 1000 );
        }
        else {
          orderList.orders.sort( (a,b) => a.date > b.date ? 1 : -1 );
        }
      });
    }

    svc.loadOrdersForDateRange = ( startDate, endDate ) => {

      let orderPromise;
      // TODO: we are assuming that startDate <= endDate. Can user error fuck things up royally?

      // TODO: make sure the startOf/endOf day mechanics work out, especially when setting an enddate from a startDate or vice versa

      // Request order data, depending upon how the newly requested date range overlaps with any existing date range
      if( !orderList.startDate || !orderList.endDate ) { // Initial loading
        console.log('Initial loading of order list');
        // Set the orderList dates to be input dates
        orderPromise = loadOrders( startDate, endDate ).then( _ => {
          orderList.startDate = startDate;
          orderList.endDate = endDate;
        });
      }
      else if( startDate < orderList.startDate && endDate >= orderList.startDate && endDate <= orderList.endDate ) {
        console.log('New interval starts before the old one and ends in the middle of the old one');
        // Extend the order list to encompass both by requesting all orders from the start of the new interval until the start of the old interval
        // Set the orderList start date to be the input start date
        orderPromise = loadOrders( startDate, orderList.startDate ).then( _ => {
          orderList.startDate = startDate;
        });
      }
      else if( startDate < orderList.startDate && endDate > orderList.endDate ) {
        console.log('New interval starts before the old and ends after the old');
        // Extend the order list in both directions by getting orders in two separate batches: one for the orders before the old list, and one for orders after the old list
        // Set both the orderList's start and end dates to the input dates
        orderPromise = Promise.all([
          loadOrders( startDate, orderList.startDate ),
          loadOrders( orderList.endDate, endDate )
        ]).then( _ => {
          orderList.startDate = startDate;
          orderList.endDate = endDate;
        });
      }
      else if( startDate >= orderList.startDate && endDate <= orderList.endDate ) {
        console.log('New interval is a subinterval of the old ');
        // No new data needed, so make a dummy promise
        orderPromise = Promise.resolve(null);
      }
      else if( startDate >= orderList.startDate && endDate > orderList.endDate ) {
        console.log('New interval starts within the old and ends past the old');
        // Extend the order list to encompass both by requesting all orders from the end of the old interval until the end of the new interval
        // Set the orderList end date to be the input end date
        orderPromise = loadOrders( orderList.endDate, endDate ).then( _ => {
          orderList.endDate = endDate;
        });
      }
      else {
        console.log('No overlap with old order list. Retrieving an entirely new list');
        // Set the orderList dates to be input dates
        orderPromise = loadOrders( startDate, endDate ).then( _ => {
          orderList.startDate = startDate;
          orderList.endDate = endDate;
        });
      }

      return $q.when( orderPromise ).then( _ => { 
        orderList.orders.sort( (a,b) => a.date > b.date ? 1 : -1 );
        console.log(orderList);
      });
    };

  }]
);