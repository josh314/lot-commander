import angular from 'angular';

const __PAGE_SIZE__ = 25;

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('ListLotsCtrl', [ 'dbEnums', 'lotStore', 'LotSvc', 'navigate', 'sessionTimeout',
  function( dbEnums, lotStore, LotSvc, navigate, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __PAGE_SIZE__,
      pageChange: refreshLotsList,
      maxSize: 5
    };

    // list options
    vm.filter = {
      status: 'All',
      handle: '',
      lotNumber: '',
    };
    vm.sortOpts = {
      key: 'createdAt',
      ascending: false
    };

    vm.lots = [];
    vm.statusOptions = dbEnums.lotStatus;
    vm.marketplaces = [undefined].concat(dbEnums.marketplaces);

    vm.saveLot = saveLot;
    vm.scanItems = scanItems;
    vm.refreshLotsList = refreshLotsList;
    vm.viewLot = viewLot;

    init();

    function init() {
      // loadUserSettings();
      refreshLotsList();
    }

    function refreshLotsList() {

      let p;

      if( vm.filter._id ) {

        p = LotSvc.get( vm.filter._id ).then( lot => {

          vm.pagination.totalItems = 0;

          const lots = [];
          if( lot ) {
            vm.pagination.totalItems += 1;
            lots.push( lot );
          }

          return lots;
        } );

      }
      else {

        const filter = {
          status: vm.filter.status==='All' ? undefined : vm.filter.status,
          handle: vm.filter.handle,
          lotNumber: vm.filter.lotNumber
        };

        p = LotSvc.count( filter ).then( resp => {
          vm.pagination.totalItems = resp.count;

          const pagedQueryOptions = {
            filter,
            sort: vm.sortOpts,
            num: __PAGE_SIZE__,
            page: vm.pagination.current,
          };

          return LotSvc.list( pagedQueryOptions );

        });

      }

      p.then( lots => {

        lots.forEach( lot =>{
          lot.readableUpdatedAt = (new Date(lot.updatedAt)).toLocaleString();
          lot.readableCreatedAt = (new Date(lot.createdAt)).toLocaleString();
        });

        vm.lots = lots;
      });

    }

    function scanItems( lotId ) {
      const targetLot = vm.lots.find(lot => lot._id === lotId);
      if(targetLot) {
        lotStore.save(targetLot);

        let manP;
        if( lotStore.manifestId ) {
          manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
            lotStore.setInventory( manifest.inventory );
          });
        }

        manP ? manP.then( _ => navigate.scanLot( lotId ) ) : navigate.scanLot( lotId );

      }
    }

    function viewLot( lotId ) {
      const targetLot = vm.lots.find(lot => lot._id === lotId);
      if(targetLot) {
        lotStore.save(targetLot);

        let manP;
        if( lotStore.manifestId ) {
          manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
            lotStore.setInventory( manifest.inventory );
          });
        }

        manP ? manP.then( _ => navigate.viewLot( lotId ) ) : navigate.viewLot( lotId );

      }
    }

    function saveLot( lot ) {

      return LotSvc.edit( lot._id, lot );

    }

  }
]);
