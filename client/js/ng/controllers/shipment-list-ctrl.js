import angular from 'angular';

const prettifyDate = dt => dt && dt.toLocaleDateString();

const __PAGE_SIZE__ = 10;
const __USER_SETTINGS_SUBKEY__ = 'shipment-list-page';

/******************* Shipment List Page Controller *************************/
angular.module('myApp').controller('ShipmentListCtrl', [ 'LoggedInUser', 'navigate', 'sessionTimeout', 'SettingsSvc', 'ShipmentManagerSvc', 'UtilitiesSvc',
  function( LoggedInUser, navigate, sessionTimeout, SettingsSvc, ShipmentManagerSvc, UtilitiesSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    // Permissions
    vm.showCreateIncomingShipmentButton = LoggedInUser.hasPermission('CREATE_INCOMING_SHIPMENT');
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');

    vm.showColumnOptions = false;
    vm.toggleShowColumnOptions = () => vm.showColumnOptions = !vm.showColumnOptions;

    vm.filter = {
      handle: '',
      status: 'all',
      includeClosed: false,
      populatePalletsReceived: true,
      isPaidFor: null,
      isReadyForTransportation: null,
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
      arrivalDateExpected: {
        displayName: 'Expected',
        defaultSortAscending: false,
        transform: prettifyDate,
        active: true,
        optionAvailable: true
      },
      arrivalDate: {
        displayName: 'Arrived',
        defaultSortAscending: false,
        transform: prettifyDate,
        active: true,
        optionAvailable: true
      },
      vendor: {
        displayName: 'Vendor',
        defaultSortAscending: true,
        active: true,
        optionAvailable: vm.showPurchasingData
      },
      cost: {
        displayName: 'Cost',
        active: false,
        optionAvailable: vm.showPurchasingData,
        noSort: true,
        transform: UtilitiesSvc.displayAsMoney.bind( UtilitiesSvc ),
      },
      transportationCost: {
        displayName: 'Transportation Cost',
        active: false,
        optionAvailable: vm.showPurchasingData,
        noSort: true,
      },
      source: {
        displayName: 'Source',
        defaultSortAscending: true,
        active: false,
        optionAvailable: vm.showPurchasingData
      },
      units: {
        displayName: 'Total Units',
        active: false,
        optionAvailable: true,
        noSort: true,
      },
      carrier: {
        displayName: 'Carrier',
        defaultSortAscending: true,
        active: false,
        optionAvailable: true
      },
      status: {
        displayName: 'Status',
        active: true,
        optionAvailable: true,
        noSort: true
      },
      isReceived: {
        displayName: 'Received?',
        active: true,
        optionAvailable: true
      },
      isPaidFor: {
        displayName: 'Paid For?',
        active: true,
        optionAvailable: vm.showPurchasingData
      },
      isReadyForTransportation: {
        displayName: 'Ready for transport?',
        active: true,
        optionAvailable: true
      },
    };
    vm.toggleColumnActive = columnKey => {

      vm.columns[ columnKey ].active = !vm.columns[ columnKey ].active;

      saveUserSettings();

    };

    vm.refreshShipmentsList = refreshShipmentsList;

    vm.sortListBy = sortKey => {
      
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

    // Settings

    const loadUserSettings = () => {
      const userSettings = SettingsSvc.get( __USER_SETTINGS_SUBKEY__ );

      if( userSettings ) {

        if( userSettings.activeColumns ) {

          for ( let [ columnName, columnData ] of Object.entries(vm.columns) ) {

            columnData.active = userSettings.activeColumns.includes( columnName );

          }

        }

      }

    };

    const saveUserSettings = () => {

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

    };

    const init = () => {
      loadUserSettings();
      refreshShipmentsList();
    };

    // Initialize the page
    init();
  }
]);
