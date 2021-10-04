import angular from 'angular';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('ListLotsCtrl', [ 'dbEnums', 'lotStore', 'LotSvc', 'navigate', 'sessionTimeout',
  function( dbEnums, lotStore, LotSvc, navigate, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.lots = [];
    vm.statusOptions = dbEnums.lotStatus;
    vm.lotStatus = 'All';
    vm.marketplaces = [undefined].concat(dbEnums.marketplaces);

    vm.saveLot = saveLot;
    vm.scanItems = scanItems;
    vm.update = updateLotList;
    vm.viewLot = viewLot;

    function updateLotList() {
      //TODO: incorporate search/sort options
      const query = {
        status: vm.lotStatus==='All' ? undefined : vm.lotStatus,
        handle: vm.lotHandle,
        endDate: vm.endDate,
        startDate: vm.startDate,
      };

      LotSvc.list( query ).then( lots => {

        lots.forEach( lot =>{
          lot.readableUpdatedAt = (new Date(lot.updatedAt)).toLocaleString();
          lot.readableCreatedAt = (new Date(lot.createdAt)).toLocaleString();
        });
        vm.lots = lots;

      });

    }
    updateLotList();

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
