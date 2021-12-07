import angular from 'angular';

const __PAGE_SIZE__ = 25;
const __USER_SETTINGS_SUBKEY__ = 'received-pallet-list-page';

/******************* Shipment List Page Controller *************************/
angular.module('myApp').controller('ReceivedPalletListCtrl', [ 'LoggedInUser', 'navigate', 'palletCategories', 'sessionTimeout', 'SettingsSvc', 'ReceivedPalletManagerSvc',
  function( LoggedInUser, navigate, palletCategories, sessionTimeout, SettingsSvc, ReceivedPalletManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    // Permissions
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');

    vm.filter = {
      handle: '',
      populateShipment: true,
      status: 'not brokendown'
    };
    vm.categoryOptions = [ "" ].concat( palletCategories );
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

    vm.columns = ReceivedPalletManagerSvc.getListColumns();

    vm.showColumnOptions = false;
    vm.toggleShowColumnOptions = () => vm.showColumnOptions = !vm.showColumnOptions;
    vm.toggleColumnActive = toggleColumnActive;
    vm.sortListBy = sortListBy;
    vm.refreshPalletsList = refreshPalletsList;

    vm.createPallet = () => navigate.receivedPalletCreation();

    function init() {
      loadUserSettings();
      refreshPalletsList();
    }

    function toggleColumnActive( columnKey ) {

      vm.columns[ columnKey ].active = !vm.columns[ columnKey ].active;

      saveUserSettings();

    }

    function sortListBy( sortKey ) {

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

      refreshPalletsList();
    }

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

          pallets.forEach( p => {
            p.toggleShowNote = () => p.showNote = !p.showNote;
          });

          vm.pallets = pallets;
        });

      });

    }

    function loadUserSettings() {
      const userSettings = SettingsSvc.get( __USER_SETTINGS_SUBKEY__ );

      if( userSettings ) {

        if( userSettings.activeColumns ) {

          for ( let [ columnName, columnData ] of Object.entries(vm.columns) ) {

            columnData.active = userSettings.activeColumns.includes( columnName );

          }

        }

      }

    }

    function saveUserSettings() {

      const activeColumns = [];
      for( let column in vm.columns ) {
        
        if( vm.columns[ column ].active ) {
          activeColumns.push( column );
        }

      }

      const userSettings = SettingsSvc.get( __USER_SETTINGS_SUBKEY__ );

      SettingsSvc.save( 
        __USER_SETTINGS_SUBKEY__, 
        userSettings ? Object.assign( userSettings, { activeColumns: activeColumns } ) : { activeColumns: activeColumns }
      );

    }

    // Initialize the page
    init();

  }
]);