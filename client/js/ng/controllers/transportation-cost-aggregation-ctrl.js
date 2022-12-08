import angular from 'angular';
import dayjs from 'dayjs';

import * as util from '../../utilities';

const __TODAY__ = dayjs().startOf('day');

/******************* Transportation Cost Aggregation Controller *************************/
angular.module('myApp').controller( 'TransportationCostAggregationCtrl', [

  'sessionTimeout',
  'ShipmentManagerSvc',

  function(

    sessionTimeout,
    ShipmentManagerSvc,

  ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    init();


    function refreshAggregation() {

      const _startDate = dayjs( vm.inputs.aggregationStartDate ).startOf('day');

      const _endDate = dayjs( vm.inputs.aggregationEndDate ).endOf('day');

      return ShipmentManagerSvc.aggregateTransportationCosts( _startDate.format(), _endDate.format(), vm.inputs.aggregationPeriod ).then( buckets => {

        vm.aggregationRows = buckets.map( _ => Object.assign( _, { displayDate: util.prettifyDate( _.date ) }) );

        vm.displayEndDate = _endDate.toDate().toLocaleDateString();

      } );

    }

    function init() {
      vm.aggregationRows = [];
      vm.refreshAggregation = refreshAggregation;

      vm.inputs = {
        aggregationStartDate: __TODAY__.toDate(),
        aggregationEndDate: __TODAY__.toDate(),
        aggregationMinDate: dayjs('2021-01-01').format('YYYY-MM-DD'),
        aggregationMaxDate: __TODAY__.format('YYYY-MM-DD'),
        periodOptions: [
          'year',
          'quarter',
          'month',
          'week',
          'day',
        ],
        aggregationPeriod: 'month',
      };

      refreshAggregation();

    }

  }
]);