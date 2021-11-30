import angular from 'angular';

const __PAGE_SIZE__ = 25;

/******************* Shipment List Page Controller *************************/
angular.module('myApp').controller('ReceivedPalletListCtrl', [ 'navigate', 'sessionTimeout', 'ReceivedPalletManagerSvc',
  function( navigate, sessionTimeout, ReceivedPalletManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.filter = {
      handle: '',
      populateShipment: true,
      status: 'not brokendown'
    };
    vm.pallets = [];
    vm.sortOpts = {
      key: 'createdAt',
      ascending: true
    };

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __PAGE_SIZE__,
      pageChange: refreshPalletsList,
      maxSize: 8
    };

    vm.refreshPalletsList = refreshPalletsList;

    vm.createPallet = () => navigate.receivedPalletCreation();

    function refreshPalletsList() {

      const filter = vm.filter;

      return ReceivedPalletManagerSvc.count( filter ).then( count => {
        vm.pagination.totalItems = count;

        const pagedQueryOptions = {
          filter,
          sort: vm.sortOpts,
          num: __PAGE_SIZE__,
          page: vm.pagination.current,
        };

        return ReceivedPalletManagerSvc.list( pagedQueryOptions ).then( pallets => {
          vm.pallets = pallets;
        });

      });

    }


    const init = () => {
      refreshPalletsList();
    };

    // Initialize the page
    init();

  }
]);