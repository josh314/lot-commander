import angular from 'angular';
import { palletProperties } from '../../constants';

const __PAGE_SIZE__ = 25;

/******************* Pallets List Page Controller *************************/
angular.module('myApp').controller( 'InventoryPalletsToBeListedCtrl', [

  'InventoryPalletManagerSvc',
  'LoggedInUser',
  'navigate',
  'PalletLotSvc',
  'ShipmentManagerSvc',

  function(

    InventoryPalletManagerSvc,
    LoggedInUser,
    navigate,
    PalletLotSvc,
    ShipmentManagerSvc,

  ) {
    const vm = this;
    // Initialize the page
    init();

    function init() {

      // Permissions
      vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
      vm.allowShipmentNavigation = LoggedInUser.hasPermission('VIEW_INCOMING_SHIPMENT');
      vm.allowLotNavigation = LoggedInUser.hasPermission('VIEW_LOT');

      // list options
      vm.filter = {
        handle: '',
        lotNumber: '',
        populateShipment: true,
        populateLot: true,
        isBrokendown: false,
        hasLot: false,
        toBeListed: true,
        isRepacked: null,
        isMissing: false,
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

      vm.columns = InventoryPalletManagerSvc.getListColumns( [
        'handle',
        'shipment',
        'lot',
        'lotNumber',
        'category',
        'condition',
        'createdAt',
        'repackPallet',
        'splitPallet',
        'makeLot'
      ] );

      vm.sortListBy = sortListBy;
      vm.refreshPalletsData = refreshPalletsData;
      vm.showPalletDetails = showPalletDetails;
      vm.createLotFromPallet = createLotFromPallet;
      vm.repackPallet = repackPallet;
      vm.splitPallet = splitPallet;

      refreshPalletsData();
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
      filter.isBrokendown = filter.hasLot;

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

      if( vm.allowShipmentNavigation && pallet.shipment && !pallet.shipment.isHydrated ) {
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

    function repackPallet( pallet ) {
      navigate.repackPallet( pallet._id );
    }

    function splitPallet( pallet ) {
      navigate.splitPallet( pallet._id );
    }

  }
]);