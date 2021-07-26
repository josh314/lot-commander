import angular from 'angular';

import * as api from '../api';


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

angular.module('myApp').factory('NewManualInventorySvc', [ function(){
  const inventory = [];
  let notes = '';

  const clear = () => {
    inventory.splice( 0, inventory.length );
    notes = '';
  };

  const set = _inventory => {
    clear();
    inventory.splice( 0, 0, ...JSON.parse( JSON.stringify(_inventory.inventory) ) );
    notes = _inventory.notes;
  };

  const addInventory = () => inventory.push({ name: '', quantity: '' });

  const removeInventory = idx => inventory.splice( idx, 1 );

  const isEmpty = () => !inventory.length;

  const isInvalid = () => {
    let invalid = false;

    if( isEmpty() ) {
      invalid = true;    
    }
    else {

      inventory.forEach( _ => { 
        
        _.nameInvalid = !_.name;
        _.quantityInvalid = typeof _.quantity !== 'number' || _.quantity < 0; 

      });

      invalid = inventory.some( _ => _.nameInvalid || _.quantityInvalid );

    }

    return invalid;
  };

  const getData = () => ({
    inventory,
    notes
  });

  return {
    inventory,
    notes,
    clear,
    set,
    addInventory,
    removeInventory,
    isInvalid,
    isEmpty,
    getData
  };

}]);

/******************* Manual Inventory Controller *************************/
angular.module('myApp').controller('ManualInventoryCtrl', [ 'LoggedInUser', 'ManualInventorySvc', 'NewManualInventorySvc', 'sessionTimeout', 
  function( LoggedInUser, ManualInventorySvc, NewManualInventorySvc, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.showCreateInventoryControls = LoggedInUser.hasPermission('CREATE_MANUAL_INVENTORY');
    vm.newInventory = NewManualInventorySvc;
    vm.submitNewInventory = submitNewInventory;
    vm.startEditManualInventory = startEditManualInventory;
    vm.cancelEditManualInventory = cancelEditManualInventory;
    vm.deleteManualInventory = deleteManualInventory;
    
    function submitNewInventory() {

      if( NewManualInventorySvc.isInvalid() ) {
        return;
      }

      let req;

      if( vm.editingInventoryId ) {

        req = ManualInventorySvc.edit( vm.editingInventoryId );
        vm.editingInventoryId = null;
      }
      else {

        req = ManualInventorySvc.create();
          
      }

      req
        .then( _ => NewManualInventorySvc.clear() )
        .then( _ => refresh() );

    }

    function startEditManualInventory( inventory ) {

      NewManualInventorySvc.clear( );

      NewManualInventorySvc.set( inventory );

      vm.editingInventoryId = inventory._id;

    }

    function cancelEditManualInventory( ) {
      vm.editingInventoryId = null;
      NewManualInventorySvc.clear();
    }

    function deleteManualInventory( inventory ) {
      return ManualInventorySvc.delete( inventory._id ).then( _ => refresh() );
    }

    function refreshManualInventoryList() {
      return ManualInventorySvc.list().then( resp => {

        resp.manualInventory.forEach( _ => _.createdAt = new Date( _.createdAt ) );

        vm.manualInventoryList = resp.manualInventory;
      });
    }

    function refresh() {
      refreshManualInventoryList();
    }

    //TODO: clear newInventory button
    const init = () => {
      refresh();
    };

    // Initialize the page
    init();
  }
]);