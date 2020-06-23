import angular from 'angular';

import moment from 'moment';

import { Graph } from '../graph';
import * as api from '../api';

/******************* Orders Report Page Controller *************************/
angular.module('myApp').controller('ReportsCtrl', [ '$q', 'sessionTimeout',
  function( $q, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.isGraphLoaded = false;
    vm.waitingForData = false;

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

    function loadGraph( data ) {

      const labelFormat = ( ( units, dateDuration ) => {
        if( units === 'month' ) {
          const format = dateDuration > moment.duration( 1, 'year' ) ? 'MMM YYYY' : 'MMM';
          return m => m.format( format );
        }
        else {
          return m => m.format('MM/DD');
        }
      } )( vm.inputs.timeUnits.units, moment.duration( moment(vm.inputs.endDate).diff( moment(vm.inputs.startDate) )  ) );

      let graphData = data.map( x => ({ date: moment.utc(x.date).format(), label: labelFormat( moment(x.date) ), value: x.units }) );

      // fill in zeros for missing data
      const labelPeriod = vm.inputs.timeUnits.units === 'week' ? 'isoWeek' : vm.inputs.timeUnits.units;
      for( let m = moment.utc(vm.inputs.startDate).startOf( labelPeriod ) ; m < moment.utc(vm.inputs.endDate).startOf( labelPeriod ) ; m.add( 1, vm.inputs.timeUnits.units ) ) {
        const label = labelFormat(m);
        const found = graphData.find( _ => _.label === label );
        if( !found ) {
          graphData.push( { date: m.format(), label: label, value: 0 } );
        }
      }

      graphData.sort( (a,b) => a.date < b.date ? -1 : 1 );

      vm.graph.loadData( graphData );
    }
   
    function load() {
      vm.waitingForData = true;
      vm.isGraphLoaded = false;
      const reportOptions = {
        startDate: moment(vm.inputs.startDate).format('YYYY-MM-DD'),
        endDate: moment(vm.inputs.endDate).format('YYYY-MM-DD'),
        tag: vm.inputs.tagFilter,
        binSize: vm.inputs.timeUnits.units
      };

      $q.when( api.unitsSoldReport( reportOptions ) ).then( reportItems => {
        loadGraph( reportItems );
        vm.waitingForData = false;
        vm.isGraphLoaded = true;
      });
    }
    vm.load = load;

  }]
);

// TODO: use local timezones 