import angular from 'angular';
import dayjs from 'dayjs';

import { ManualInventory } from '../../manual-inventory.js';

/******************* Manual Inventory Controller *************************/
angular.module('myApp').controller('ManualInventoryCtrl', [ '$anchorScroll', 'LoggedInUser', 'ManualInventorySvc', 'sessionTimeout', 
  function( $anchorScroll, LoggedInUser, ManualInventorySvc, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const TODAY = dayjs().format('YYYY-MM-DD');

    const vm = this;
    vm.showCreateInventoryControls = LoggedInUser.hasPermission('CREATE_MANUAL_INVENTORY');
    vm.newInventory = new ManualInventory();
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

      vm.newInventory.addGroup( vm.groupToAdd );
      vm.groupToAdd = '';

    }

    function removeGroup( grp ) {

      vm.newInventory.removeGroup( grp );

    }

    function submitNewInventory() {

      if( vm.newInventory.isInvalid() ) {
        return;
      }

      let req;

      if( vm.editingInventoryId ) {

        req = ManualInventorySvc.edit( vm.editingInventoryId, vm.newInventory.getData() );
        vm.editingInventoryId = null;
      }
      else {

        req = ManualInventorySvc.create( vm.newInventory.getData() );
          
      }

      req
        .then( _ => vm.newInventory.clear() )
        .then( _ => refresh() );

    }

    // TODO!!!!!!!!!!!! Re-evaluate editting functionality. 
    // - Are new fields editable?
    // - append-only actions in DB

    function startEditManualInventory( inventory ) {

      vm.newInventory.clear( );
      vm.newInventory.set( inventory );
      vm.editingInventoryId = inventory._id;

      // scroll to the top of page to show input form
      $anchorScroll();

    }

    function cancelEditManualInventory( ) {
      vm.editingInventoryId = null;
      vm.newInventory.clear();
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
      refresh();
    };

    // Initialize the page
    init();
  }
]);