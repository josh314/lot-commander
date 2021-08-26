import angular from 'angular';

import moment from 'moment';

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


/******************* New Manual Inventory Service *************************/
angular.module('myApp').factory('NewManualInventorySvc', [ function(){

  const data = {
    reportDate: new Date(),
    inventory: [],
    notes: '',
  };

  const clear = () => {
    data.inventory.splice( 0, data.inventory.length );
    data.notes = '';
    data.reportDate = new Date();
  };

  const set = _inventory => {
    clear();
    data.inventory.splice( 0, 0, ...JSON.parse( JSON.stringify(_inventory.inventory) ) );
    data.notes = _inventory.notes;
    data.reportDate = _inventory.reportDate;
  };

  const addInventory = () => data.inventory.push({ name: '', quantity: '' });

  const removeInventory = idx => data.inventory.splice( idx, 1 );

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
    isInvalid,
    isEmpty,
    getData
  };

}]);

/******************* Manual Inventory Controller *************************/
angular.module('myApp').controller('ManualInventoryCtrl', [ 'LoggedInUser', 'ManualInventorySvc', 'NewManualInventorySvc', 'sessionTimeout', 
  function( LoggedInUser, ManualInventorySvc, NewManualInventorySvc, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const TODAY = moment().format('YYYY-MM-DD');

    const vm = this;
    vm.showCreateInventoryControls = LoggedInUser.hasPermission('CREATE_MANUAL_INVENTORY');
    vm.newInventory = NewManualInventorySvc;
    vm.newInventoryMaxReportDate = TODAY;
    vm.submitNewInventory = submitNewInventory;
    vm.startEditManualInventory = startEditManualInventory;
    vm.cancelEditManualInventory = cancelEditManualInventory;
    vm.deleteManualInventory = deleteManualInventory;
    vm.search = search;
    
    vm.searchInputs = {
      // startDate: moment().startOf('day').toDate(),
      endDate: moment().endOf('day').toDate(),
      minDate: moment('2021-01-01').format('YYYY-MM-DD'),
      maxDate: TODAY,
    };

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

    function refreshManualInventoryList( options = {} ) {
      return ManualInventorySvc.list( options ).then( resp => {

        resp.manualInventory.forEach( _ => _.reportDate = new Date( _.reportDate ) );

        vm.manualInventoryList = resp.manualInventory;
      });
    }

    function refresh() {
      refreshManualInventoryList();
    }

    function search() {

      const qp = {};

      if( vm.searchInputs.startDate ) {

        qp.start_date = moment( vm.searchInputs.startDate ).format('YYYY-MM-DD');

      }

      if( vm.searchInputs.endDate ) {

        qp.end_date = moment( vm.searchInputs.endDate ).format('YYYY-MM-DD');

      }

      refreshManualInventoryList( qp );

    }

    //TODO: clear newInventory button
    const init = () => {
      refreshManualInventoryList();
    };

    // Initialize the page
    init();
  }
]);