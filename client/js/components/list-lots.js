import angular from 'angular';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('ListLotsCtrl', [ '$scope', 'dbEnums', 'lotStore', 'LotSvc', 'navigate', 'saveLot', 'sessionTimeout',
  function( $scope, dbEnums, lotStore, LotSvc, navigate, saveLot, sessionTimeout ) {
    sessionTimeout.timeoutExpired();
    $scope.lots = [];

    $scope.statusOptions = dbEnums.lotStatus;
    $scope.lotStatus = 'All';

    $scope.marketplaces = [undefined].concat(dbEnums.marketplaces);

    function updateLotList() {
      //TODO: incorporate search/sort options
      const query = {
        status: $scope.lotStatus==='All' ? undefined : $scope.lotStatus,
        handle: $scope.lotHandle,
        endDate: $scope.endDate,
        startDate: $scope.startDate,
      };

      LotSvc.list( query ).then( lots => {

        lots.forEach( lot =>{
          lot.readableUpdatedAt = (new Date(lot.updatedAt)).toLocaleString();
          lot.readableCreatedAt = (new Date(lot.createdAt)).toLocaleString();
        });
        $scope.lots = lots;

      });

    }
    updateLotList();
    $scope.update = updateLotList;

    $scope.scanItems = function(lotId) {
      const targetLot = $scope.lots.find(lot => lot._id === lotId);
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
    };

    $scope.viewLot = function(lotId) {
      const targetLot = $scope.lots.find(lot => lot._id === lotId);
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
    };

    $scope.saveLot = saveLot;

  }
]);
