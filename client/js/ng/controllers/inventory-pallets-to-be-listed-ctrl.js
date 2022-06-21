import angular from 'angular';

const __PAGE_SIZE__ = 25;

/******************* Pallets List Page Controller *************************/
angular.module('myApp').controller( 'InventoryPalletsToBeListedCtrl', [

  'InventoryPalletManagerSvc',
  'LoggedInUser',
  'navigate',
  'PalletLotSvc',
  'palletProperties',
  'sessionTimeout',
  'ShipmentManagerSvc',

  function(

    InventoryPalletManagerSvc,
    LoggedInUser,
    navigate,
    PalletLotSvc,
    palletProperties,
    sessionTimeout,
    ShipmentManagerSvc,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    // Permissions
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
    vm.allowShipmentNavigation = LoggedInUser.hasPermission('VIEW_INCOMING_SHIPMENT');
    vm.allowLotNavigation = LoggedInUser.hasPermission('VIEW_LOT');

    // list options
    vm.filter = {
      handle: '',
      populateShipment: true,
      populateLot: true,
      status: 'not brokendown',
      hasLot: false,
      toBeListed: true
    };
    vm.categoryOptions = [ "" ].concat( palletProperties.category );
    vm.conditionOptions = [ "" ].concat( palletProperties.condition );
    vm.sortOpts = {
      key: 'createdAt',
      ascending: true
    };

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __PAGE_SIZE__,
      pageChange: refreshPalletsData,
      maxSize: 8
    };

    vm.columns = InventoryPalletManagerSvc.getListColumns();

    vm.sortListBy = sortListBy;
    vm.refreshPalletsData = refreshPalletsData;
    vm.showPalletDetails = showPalletDetails;
    vm.createLotFromPallet = createLotFromPallet;

    function init() {
      initListColumns();
      refreshPalletsData();
    }

    function initListColumns() {

      Object.values( vm.columns ).forEach( c => c.active = false );

      const activeColumns = [
        'handle',
        'shipment',
        'lot',
        'category',
        'condition',
        'createdAt',
      ];

      for( let _ of activeColumns ) {
        vm.columns[ _ ].active = true;
      }

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

      refreshPalletsData();
    }

    function refreshPalletsData() {

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

    async function showPalletDetails( pallet ) {

      if( pallet.shipment ) {
        const shipment = await ShipmentManagerSvc.loadShipment( { shipmentId: pallet.shipment._id, populate: [ 'palletsReceived', 'palletsConsolidated' ]  } );
        pallet.shipment = shipment;

      }

      pallet.detailsModal().then( refreshPalletsData );
    }


    function createLotFromPallet( pallet ) {

      PalletLotSvc.createLotWithUi( pallet )
        .then( lot => navigate.viewLot( lot._id ), console.log('dismissed') );
      // TODO: handle error if lot not created. Particular issue is if the auto-generated handle is a dupe

    }

    // Initialize the page
    init();

  }
]);