import angular from 'angular';
import dayjs from 'dayjs';

const __TODAY__ = dayjs().startOf('day');

/******************* Pallets List Page Controller *************************/
angular.module('myApp').controller( 'PurchaseAggregationCtrl', [

  'LoggedInUser',
  'sessionTimeout',
  'ShipmentManagerSvc',
  'UtilitiesSvc',

  function(

    LoggedInUser,
    sessionTimeout,
    ShipmentManagerSvc,
    UtilitiesSvc,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
    vm.refreshPurchaseAggregation = refreshPurchaseAggregation;


    // aggregation options
    vm.aggregationStartDate = __TODAY__.toDate();
    vm.aggregationEndDate = __TODAY__.toDate();
    vm.aggregationMinDate = dayjs('2021-01-01').format('YYYY-MM-DD');
    vm.aggregationMaxDate = __TODAY__.format('YYYY-MM-DD');

    function init() {
      refreshPurchaseAggregation();
    }

    function refreshPurchaseAggregation() {

      const startDate = dayjs( vm.aggregationStartDate ).startOf('day').format();

      const endDate = dayjs( vm.aggregationEndDate ).endOf('day').format();

      return ShipmentManagerSvc.aggregateExpectedPallets( startDate, endDate ).then( pallets => {

        vm.palletsAggregation = pallets.map( _p => Object.assign( {}, _p, { cost: UtilitiesSvc.displayAsMoney( _p.cost ) }));

        vm.aggregationTotalCost = UtilitiesSvc.displayAsMoney( pallets.reduce( ( total, _p ) => _p.cost ? total + _p.cost : total , 0 ) );

        vm.aggregationTotalCount = pallets.reduce( ( total, _p ) => _p.count ? total + _p.count : total , 0 );

      });

    }

    // Initialize the page
    init();

  }
]);