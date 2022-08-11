import angular from 'angular';
import dayjs from 'dayjs';

const __PAGE_SIZE__ = 25;
const __USER_SETTINGS_SUBKEY__ = 'inventory-pallet-view-page';
const __DISPLAY_MODE_LIST__ = '__DISPLAY_MODE_LIST__';
const __DISPLAY_MODE_AGGREGATE__ = '__DISPLAY_MODE_AGGREGATE__';
const __TODAY__ = dayjs().startOf('day');

/******************* Pallets List Page Controller *************************/
angular.module('myApp').controller( 'InventoryPalletViewCtrl', [

  'InventoryPalletManagerSvc',
  'LoggedInUser',
  'navigate',
  'PalletLotSvc',
  'palletProperties',
  'sessionTimeout',
  'SettingsSvc',
  'ShipmentManagerSvc',
  'UtilitiesSvc',

  function(

    InventoryPalletManagerSvc,
    LoggedInUser,
    navigate,
    PalletLotSvc,
    palletProperties,
    sessionTimeout,
    SettingsSvc,
    ShipmentManagerSvc,
    UtilitiesSvc,

  ) {

    // Initialize the page
    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      vm.displayModes = {
        LIST: __DISPLAY_MODE_LIST__,
        AGGREGATE: __DISPLAY_MODE_AGGREGATE__,
      };
      vm.displayModeActive = vm.displayModes.LIST;
      vm.displayModeActiveIs = str => str === vm.displayModeActive;
      vm.setDisplayModeActive = str => (vm.displayModeActive = str) && refreshPalletsData();
  
      // Permissions
      vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
      vm.allowShipmentNavigation = LoggedInUser.hasPermission('VIEW_INCOMING_SHIPMENT');
      vm.allowLotNavigation = LoggedInUser.hasPermission('VIEW_LOT');
  
      // aggregation options
      vm.aggregationReportDate = __TODAY__.toDate();
      vm.aggregationReportMinDate = dayjs('2021-01-01').format('YYYY-MM-DD');
      vm.aggregationReportMaxDate = __TODAY__.format('YYYY-MM-DD');
  
      // list mode options
      vm.filter = {
        handle: '',
        populateShipment: true,
        populateLot: true,
        isBrokendown: null,
        // status: 'not brokendown',
        toBeListed: null,
        isRepacked: null,
        hasLot: null,
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
      vm.createLotFromPallet = createLotFromPallet;
      vm.repackPallet = repackPallet;
  
      vm.createPallet = () => navigate.inventoryPalletCreation();
  
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

      const date = dayjs( vm.aggregationReportDate ).endOf('day').format();

      return InventoryPalletManagerSvc.aggregate( date ).then( pallets => {

        vm.palletsAggregation = pallets.map( _p => Object.assign( {}, _p, { cost: UtilitiesSvc.displayAsMoney( _p.cost ) }));

        vm.aggregationTotalCost = UtilitiesSvc.displayAsMoney( pallets.reduce( ( total, _p ) => _p.cost ? total + _p.cost : total , 0 ) );

        vm.aggregationTotalCount = pallets.reduce( ( total, _p ) => _p.count ? total + _p.count : total , 0 );

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

    function createLotFromPallet( pallet ) {


      PalletLotSvc.createLotWithUi( pallet )
        .then( lot => navigate.viewLot( lot._id ), console.log('dismissed') );
      // TODO: handle error if lot not created. Particular issue is if the auto-generated handle is a dupe

    }

    function repackPallet( pallet ) {
      navigate.repackPallet( pallet._id );
    }

  }
]);