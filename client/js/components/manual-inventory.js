import angular from 'angular';

import dayjs from 'dayjs';

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

/******************* Manual Inventory Controller *************************/
angular.module('myApp').controller('ManualInventoryCtrl', [ '$anchorScroll', 'LoggedInUser', 'ManualInventorySvc', 'NewManualInventorySvc', 'sessionTimeout', 
  function( $anchorScroll, LoggedInUser, ManualInventorySvc, NewManualInventorySvc, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const TODAY = dayjs().format('YYYY-MM-DD');

    const vm = this;
    vm.showCreateInventoryControls = LoggedInUser.hasPermission('CREATE_MANUAL_INVENTORY');
    vm.newInventory = NewManualInventorySvc;
    vm.newInventoryMaxReportDate = TODAY;
    vm.addGroup = addGroup;
    vm.removeGroup = removeGroup;
    vm.submitNewInventory = submitNewInventory;
    vm.startEditManualInventory = startEditManualInventory;
    vm.cancelEditManualInventory = cancelEditManualInventory;
    vm.deleteManualInventory = deleteManualInventory;
    vm.search = search;
    
    vm.searchInputs = {

      // startDate: dayjs().startOf('day').toDate(),
      endDate: dayjs().endOf('day').toDate(),
      minDate: dayjs('2021-01-01').format('YYYY-MM-DD'),
      maxDate: TODAY,

      groups: [],
      groupToAdd: '',
      // Turn off the rule or eslint will complain about the usage of `this`
      /* eslint-disable angular/controller-as-vm */
      addGroup: function() {

        if( !this.groupToAdd || this.groups.includes( this.groupToAdd ) ) {
          return;
        }

        this.groups.push( this.groupToAdd );
        this.groupToAdd = '';

      },
      removeGroup: function( grp ) {

        if( !grp ) {
          return;
        }
    
        const foundIdx = this.groups.findIndex( _ => _ === grp );
    
        if( foundIdx >= 0 ) {
    
          this.groups.splice( foundIdx, 1 );
    
        }
      },
      /* eslint-enable */

    };

    function addGroup() {

      NewManualInventorySvc.addGroup( vm.groupToAdd );
      vm.groupToAdd = '';

    }

    function removeGroup( grp ) {

      NewManualInventorySvc.removeGroup( grp );

    }

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

    // TODO!!!!!!!!!!!! Re-evaluate editting functionality. 
    // - Are new fields editable?
    // - append-only actions in DB

    function startEditManualInventory( inventory ) {

      NewManualInventorySvc.clear( );

      NewManualInventorySvc.set( inventory );

      vm.editingInventoryId = inventory._id;

      // scroll to the top of page to show input form
      $anchorScroll();

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

        qp.start_date = dayjs( vm.searchInputs.startDate ).format('YYYY-MM-DD');

      }

      if( vm.searchInputs.endDate ) {

        qp.end_date = dayjs( vm.searchInputs.endDate ).format('YYYY-MM-DD');

      }

      if( vm.searchInputs.groups.length ) {

        qp.groups = vm.searchInputs.groups.join(',');

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