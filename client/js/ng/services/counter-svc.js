import angular from 'angular';

import * as api from '../../api';

/******************* Service for managing lots ***/
angular.module('myApp').factory( 'CounterSvc', [ '$q', function( $q ) {

  return {
    getPalletLotCounter,
    incrementPalletLotCounter
  };

  function getPalletLotCounter() {
    return $q.when( api.getCounter( 'pallet-lots' ) );
  }

  function incrementPalletLotCounter() {
    return $q.when( api.incrementCounter( 'pallet-lots', 1 ) );
  }


}]);