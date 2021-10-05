import angular from 'angular';

import * as api from '../../api';

/******************* Manual Inventory Service *************************/
angular.module('myApp').factory('ManualInventorySvc', [ '$q', 'NewManualInventorySvc', function( $q, NewManualInventorySvc ) {

  function _list( qp = {} ) {
    return $q.when( api.listManualInventory( qp ) );
  }

  function _create( ) {
    return $q.when( api.createManualInventory( NewManualInventorySvc.getData() ) );
  }

  function _edit( inventoryId ) {
    return _create( ).then( _ => _delete( inventoryId ) );
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


/******************* New Manual Inventory Service *************************/
angular.module('myApp').factory('NewManualInventorySvc', [ function(){

  const data = {
    reportDate: new Date(),
    inventory: [],
    groups: [],
    notes: '',
  };

  const clear = () => {
    data.inventory.splice( 0, data.inventory.length );
    data.groups.splice( 0, data.groups.length );
    data.notes = '';
    data.reportDate = new Date();
  };

  const set = _inventory => {
    clear();
    data.inventory.splice( 0, 0, ...JSON.parse( JSON.stringify(_inventory.inventory) ) );
    data.groups.splice( 0, 0, ...JSON.parse( JSON.stringify(_inventory.groups) ) );
    data.notes = _inventory.notes;
    data.reportDate = _inventory.reportDate;
  };

  const addInventory = () => data.inventory.push({ name: '', quantity: '' });

  const removeInventory = idx => data.inventory.splice( idx, 1 );

  const addGroup = grp => {

    if( !grp || data.groups.includes( grp ) ) {
      return;
    }

    data.groups.push( grp );

  };

  const removeGroup = grp => {

    if( !grp ) {
      return;
    }

    const foundIdx = data.groups.findIndex( _ => _ === grp );

    if( foundIdx >= 0 ) {

      data.groups.splice( foundIdx, 1 );

    }

  };

  const isEmpty = () => !data.inventory.length;

  const isInvalid = () => {
    let invalid = false;

    if( isEmpty() ) {
      invalid = true;    
    }
    else {

      data.inventory.forEach( _ => { 
        
        _.nameInvalid = !_.name;
        _.quantityInvalid = typeof _.quantity !== 'number' || _.quantity < 0; 

      });

      invalid = data.inventory.some( _ => _.nameInvalid || _.quantityInvalid );

    }

    return invalid;
  };

  const getData = () => data;

  return {
    data,
    clear,
    set,
    addInventory,
    removeInventory,
    addGroup,
    removeGroup,
    isInvalid,
    isEmpty,
    getData
  };

}]);
