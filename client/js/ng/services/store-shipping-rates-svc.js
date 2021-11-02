import angular from 'angular';

import * as api from '../../api';

/******************* Store Shippinbg Rates Controller *************************/
angular.module('myApp').factory('StoreShippingRatesSvc', [ '$q', function( $q ) {

  return {

    list: qp => $q.when( api.listStoreShippingRates( qp ) ).then( rates =>  {

      return rates.map( _r => Object.assign( {}, _r ) );

    }),

    edit: ( gid, newRate ) => $q.when( api.editStoreShippingRate( gid, newRate ) )

  };

}]);