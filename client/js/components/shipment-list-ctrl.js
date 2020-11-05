import angular from 'angular';

const prettifyDate = dt => dt && dt.toLocaleDateString();

const __PAGE_SIZE__ = 10;

/******************* Shipment List Page Controller *************************/
angular.module('myApp').controller('ShipmentListCtrl', [ 'navigate', 'sessionTimeout', 'ShipmentManagerSvc', 'LoggedInUser',
  function(navigate, sessionTimeout, ShipmentManagerSvc, LoggedInUser) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.filter = {
      handle: '',
      status: 'all',
      includeClosed: false,
    };
    vm.shipments = [];
    vm.sortOpts = {
      key: 'createdAt',
      ascending: false
    };

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __PAGE_SIZE__,
      pageChange: refreshShipmentsList
    };

    vm.columns = {
      handle: {
        displayName: 'Shipment ID',
        defaultSortAscending: true,
      },
      createdAt: {
        displayName: 'Created',
        defaultSortAscending: false,
        transform: prettifyDate
      },
      arrivalDateExpected: {
        displayName: 'Expected',
        defaultSortAscending: false,
        transform: prettifyDate
      },
      vendor: {
        displayName: 'Vendor',
        defaultSortAscending: true
      },
    };

    vm.showCreateIncomingShipmentButton = LoggedInUser.hasPermission('CREATE_INCOMING_SHIPMENT');

    vm.refreshShipmentsList = refreshShipmentsList;

    vm.sortListBy = sortKey => {
      if( sortKey === vm.sortOpts.key ) {
        vm.sortOpts.ascending = !vm.sortOpts.ascending;
      }
      else {
        vm.sortOpts = {
          key: sortKey,
          ascending: !!vm.columns[ sortKey ].defaultSortAscending
        };
      }
      refreshShipmentsList();
    };

    vm.createShipment = () => navigate.shipmentCreation();
    vm.startReceivingShipment = ( shipmentId ) => navigate.shipmentReceiving( shipmentId );

    function refreshShipmentsList() {

      const baseQueryOptions = {
        filter: vm.filter,
        sort: vm.sortOpts,
      };

      return ShipmentManagerSvc.countShipments( baseQueryOptions ).then( resp => {
        vm.pagination.totalItems = resp.count;

        const pagedQueryOptions = Object.assign(
          baseQueryOptions,
          {
            num: __PAGE_SIZE__,
            page: vm.pagination.current,
          },
        );

        return ShipmentManagerSvc.listShipments( pagedQueryOptions ).then( shipments => {
          vm.shipments = shipments;
        });

      });

    }

    const init = () => {
      refreshShipmentsList();
    };

    // Initialize the page
    init();
  }
]);
