import angular from 'angular';

const __PAGE_SIZE__ = 25;
const __USER_SETTINGS_SUBKEY__ = 'inventory-pallet-list-page';
const __DISPLAY_MODE_LIST__ = '__DISPLAY_MODE_LIST__';
const __DISPLAY_MODE_AGGREGATE__ = '__DISPLAY_MODE_AGGREGATE__';



/******************* Pallets List Page Controller *************************/
angular.module('myApp').controller('InventoryPalletListCtrl', [ 'InventoryPalletManagerSvc', 'LoggedInUser', 'navigate', 'palletProperties', 'sessionTimeout', 'SettingsSvc', 'ShipmentManagerSvc', 'UtilitiesSvc',
  function( InventoryPalletManagerSvc, LoggedInUser, navigate, palletProperties, sessionTimeout, SettingsSvc, ShipmentManagerSvc, UtilitiesSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.displayModes = {
      LIST: __DISPLAY_MODE_LIST__,
      AGGREGATE: __DISPLAY_MODE_AGGREGATE__,
    };
    vm.displayModeActive = vm.displayModes.LIST;
    vm.displayModeActiveIs = str => str === vm.displayModeActive;
    vm.setDisplayModeActive = str => (vm.displayModeActive = str) && refreshPalletsData();

    // Permissions
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');

    vm.filter = {
      handle: '',
      populateShipment: true,
      status: 'not brokendown'
    };
    vm.categoryOptions = [ "" ].concat( palletProperties.category );
    vm.conditionOptions = [ "" ].concat( palletProperties.condition );
    vm.palletsList = [];
    vm.palletsAggregation = [];
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

    vm.columns = InventoryPalletManagerSvc.getListColumns();

    vm.showColumnOptions = false;
    vm.toggleShowColumnOptions = () => vm.showColumnOptions = !vm.showColumnOptions;
    vm.toggleColumnActive = toggleColumnActive;
    vm.sortListBy = sortListBy;
    vm.refreshPalletsData = refreshPalletsData;
    vm.showPalletDetails = showPalletDetails;

    vm.createPallet = () => navigate.inventoryPalletCreation();

    function init() {
      loadUserSettings();
      refreshPalletsData();
    }

    function refreshPalletsData() {
      if( vm.displayModeActive === __DISPLAY_MODE_LIST__ ) {
        refreshPalletsList();
      }
      else if ( vm.displayModeActive === __DISPLAY_MODE_AGGREGATE__ ) {
        refreshPalletsAggregation();
      }
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

      return InventoryPalletManagerSvc.count( filter ).then( count => {
        vm.pagination.totalItems = count;

        const pagedQueryOptions = {
          filter,
          sort: vm.sortOpts,
          num: __PAGE_SIZE__,
          page: vm.pagination.current,
        };

        return InventoryPalletManagerSvc.list( pagedQueryOptions ).then( pallets => {

          pallets.forEach( p => {
            p.toggleShowNote = () => p.showNote = !p.showNote;
          });

          vm.palletsList = pallets;
        });

      });

    }

    function refreshPalletsAggregation() {

      return InventoryPalletManagerSvc.aggregate(  ).then( pallets => {
        vm.palletsAggregation = pallets.map( _p => Object.assign( {}, _p, { cost: UtilitiesSvc.displayAsMoney( _p.cost ) }));
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

    async function showPalletDetails( pallet ) {

      if( pallet.shipment ) {
        const shipment = await ShipmentManagerSvc.loadShipment( { shipmentId: pallet.shipment._id, populate: [ 'palletsReceived', 'palletsConsolidated' ]  } );
        pallet.shipment = shipment;

      }

      pallet.detailsModal().then( refreshPalletsList );
    }

    // Initialize the page
    init();

  }
]);