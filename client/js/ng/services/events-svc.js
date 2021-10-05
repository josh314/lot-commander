import angular from 'angular';

import * as api from '../../api';

const datify = o => Object.assign( o, { createdAt: new Date(o.createdAt), updatedAt: new Date (o.updatedAt) } );

/******************** Events Service ******************************/
angular.module('myApp').factory('EventsSvc', [ '$q', '$stateParams', function( $q, $stateParams ) { 

  return {
    getEvents: getEvents,
  };

  function getEvents( species = $stateParams.species, id = $stateParams.id ) {

    if( species === 'shipments' ) {
      return $q.when( api.getIncomingShipmentEvents( id ) ).then( resp => resp.events.map( datify ) );
    }

  }

}]);
