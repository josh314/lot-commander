import angular from 'angular';

import * as moment from 'moment';

/******************* Orders Report Page Controller *************************/
angular.module('myApp').controller('OrdersReportCtrl', [ 'RangedOrderList', 'sessionTimeout',
  function( RangedOrderList, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.orderList = {};

    vm.inputs = {
      startDate: moment().startOf('day').toDate(),
      endDate: moment().endOf('day').toDate(),
      minDate: moment('2017-12-01').format('YYYY-MM-DD'),// Wholesale Ninjas first actual orders start in this month
      maxDate: moment().format('YYYY-MM-DD'),
    };


    function loadOrdersForInputDateRange() {
      RangedOrderList.loadOrdersForDateRange( vm.inputs.startDate, vm.inputs.endDate ).then( _ => {
        vm.orderList = RangedOrderList.get();
      });
    }
    vm.loadOrdersForInputDateRange  = loadOrdersForInputDateRange;

  }]
);