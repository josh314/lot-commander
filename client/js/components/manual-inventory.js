import angular from 'angular';

import * as api from '../api';


/******************* Manual Inventory Service *************************/
angular.module('myApp').factory('ManualInventorySvc', [ '$q', function( $q ) {

  function getManualInventoryList( qp = {} ) {
    return $q.when( api.listManualInventory( qp ) );
  }

  return {
    getManualInventoryList: getManualInventoryList,
  };

}]);

/******************* Manual Inventory Controller *************************/
angular.module('myApp').controller('ManualInventoryCtrl', [ 'LoggedInUser', 'ManualInventorySvc', 'sessionTimeout', 
  function( LoggedInUser, ManualInventorySvc, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.showCreateInventoryControls = LoggedInUser.hasPermission('CREATE_MANUAL_INVENTORY');

    function refreshManualInventoryList() {
      return ManualInventorySvc.getManualInventoryList().then( resp => {
        return vm.manualInventoryList = resp.manualInventory;
      });
    }

    const init = () => {
      refreshManualInventoryList();
    };

    // Initialize the page
    init();
  }
]);