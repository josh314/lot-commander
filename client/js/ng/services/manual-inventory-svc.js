import angular from 'angular';

import * as api from '../../api';

/******************* Manual Inventory Service *************************/
angular.module('myApp').factory('ManualInventorySvc', [ '$q', function( $q ) {

  function _list( qp = {} ) {
    return $q.when( api.listManualInventory( qp ) );
  }

  function _create( data ) {
    return $q.when( api.createManualInventory( data ) );
  }

  function _edit( inventoryId, data ) {
    return _create( data ).then( _ => _delete( inventoryId ) );
  }

  function _delete( inventoryId ) {
    return $q.when( api.deleteManualInventory( inventoryId ) );
  }

  return {
    list: _list,
    create: _create,
    edit: _edit,
    delete: _delete,
  };

}]);

