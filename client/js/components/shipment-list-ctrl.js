import angular from 'angular';

/******************* Shipment List Page Controller *************************/
angular.module('myApp').controller('ShipmentListCtrl', [ 'navigate', 'sessionTimeout', 'ShipmentManagerSvc', 'LoggedInUser',
  function(navigate, sessionTimeout, ShipmentManagerSvc, LoggedInUser) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.filter = {
      handle: '',
      status: 'awaiting'
    };
    vm.shipments = [];
    vm.sortOpts = {
      key: 'createdAt',
      ascending: false
    };

    vm.columns = {
      handle: {
        displayName: 'Handle',
        defaultSortAscending: true,
      },
      createdAt: {
        displayName: 'Created',
        defaultSortAscending: false,
      },
      arrivalDateExpected: {
        displayName: 'Expected',
        defaultSortAscending: false,
      },
    };

    vm.refreshShipmentsList = refreshShipmentsList;

    vm.sortListBy = sortKey => {
      if( sortKey === vm.sortOpts.key ) {
        vm.sortOpts.ascending = !vm.sortOpts.ascending;
      }
      else {
        vm.sortOpts = {
          key: sortKey,
          ascending: vm.columns[ sortKey ].defaultSortAscending
        };
      }
      refreshShipmentsList();
    };

    vm.createShipment = () => navigate.shipmentCreation();
    vm.startReceivingShipment = ( shipmentId ) => navigate.shipmentReceiving( shipmentId );

    function refreshShipmentsList() {

      const options = {
        filter: vm.filter,
        sort: vm.sortOpts,
      };

      ShipmentManagerSvc.listShipments( options ).then( shipments => {
        vm.shipments = shipments;
      });
    }

    const init = () => {
      refreshShipmentsList();
    };

    // Initialize the page
    init();
  }
]);
