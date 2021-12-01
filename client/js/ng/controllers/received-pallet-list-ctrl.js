import angular from 'angular';

const prettifyDate = dt => dt && dt.toLocaleDateString();

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

    vm.columns = {
      handle: {
        displayName: 'Pallet ID',
        defaultSortAscending: true,
        active: true,
        optionAvailable: true
      },
      shipment: {
        displayName: 'Shipment',
        active: true,
        optionAvailable: true,
        noSort: true
      },
      category: {
        displayName: 'Category',
        defaultSortAscending: true,
        active: true,
        optionAvailable: true
      },
      createdAt: {
        displayName: 'Created',
        defaultSortAscending: false,
        transform: prettifyDate,
        active: true,
        optionAvailable: true
      },
      breakdown: {
        displayName: 'Mark As Breakdown',
        active: true,
        optionAvailable: true,
        noSort: true,
      }
    };

    vm.sortListBy = sortKey => {
      console.log('foobar')
      if( vm.columns[sortKey].noSort ) {
        return;
      }

      if( sortKey === vm.sortOpts.key ) {
        vm.sortOpts.ascending = !vm.sortOpts.ascending;
      }
      else {
        vm.sortOpts = {
          key: sortKey,
          ascending: !!vm.columns[ sortKey ].defaultSortAscending
        };
      }

      vm.pagination.current = 1;
      console.log(vm.sortOpts)
      refreshPalletsList();
    };

    vm.refreshPalletsList = refreshPalletsList;

    vm.createPallet = () => navigate.receivedPalletCreation();

    const init = () => {
      refreshPalletsList();
    };

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

    // Initialize the page
    init();

  }
]);