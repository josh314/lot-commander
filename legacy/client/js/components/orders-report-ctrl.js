import angular from 'angular';

import * as moment from 'moment';

import { Graph } from '../graph';

import { aggregateOrders } from '../order-aggregate';

/******************* Orders Report Page Controller *************************/
angular.module('myApp').controller('OrdersReportCtrl', [ 'RangedOrderList', 'sessionTimeout',
  function( RangedOrderList, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.waitingToLoadOrders = false;

    vm.orderList = {};

    vm.graph = new Graph({
      // eslint-disable-next-line angular/document-service
      selector: document.querySelector('figure.chart-container'),
      height: 500,
      width: 1000
    });

    const timeUnitsOptions = [
      { 
        displayName: 'daily',
        units: 'day'
      },
      { 
        displayName: 'weekly',
        units: 'week'
      },
      { 
        displayName: 'monthly',
        units: 'month'
      },
    ];

    vm.inputs = {
      startDate: moment().startOf('day').toDate(),
      endDate: moment().endOf('day').toDate(),
      minDate: moment('2017-12-01').format('YYYY-MM-DD'),// Wholesale Ninjas first actual orders start in this month
      maxDate: moment().format('YYYY-MM-DD'),
      tagFilterOptions: [ '', 'personal care', 'cosmetics', 'general merchandise' ],
      tagFilter: '',
      // timeUnitsOptions: [ 'daily', 'weekly', 'monthly' ],
      timeUnitsOptions: timeUnitsOptions,
      timeUnits: timeUnitsOptions[0]
    };


    function loadOrdersForInputDateRange() {
      vm.waitingToLoadOrders = true;
      RangedOrderList.loadOrdersForDateRange( vm.inputs.startDate, vm.inputs.endDate ).then( _ => {
        vm.orderList = RangedOrderList.get();
        loadGraph();
        vm.waitingToLoadOrders = false;
      });
    }
    vm.loadOrdersForInputDateRange = loadOrdersForInputDateRange;

    function loadGraph() {

      const aggregatedOrders = aggregateOrders( 
        vm.orderList.orders,
        vm.inputs.startDate,
        vm.inputs.endDate,
        { 
          timeUnits: vm.inputs.timeUnits.units,
          tagFilter: vm.inputs.tagFilter,
          aggregateByUnits: true
        }
      );

      const labelFormat = ( ( units ) => {
        if( units === 'month' ) {
          return m => m.format('MMM');
        }
        else {
          return m => m.format('MM/DD');
        }
      } )(vm.inputs.timeUnits.units);

      const graphData = aggregatedOrders.map( x => ({ label: labelFormat( x.start ), value: x.aggregatedValue }) );

      vm.graph.loadData( graphData );
    }
    vm.loadGraph = loadGraph;

  }]
);