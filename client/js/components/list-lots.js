import angular from 'angular';

import * as api from '../api';

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('ListLotsCtrl', [ '$q', '$scope', 'dbEnums', 'lotStore', 'navigate', 'saveLot', 'sessionTimeout', 
  function( $q, $scope, dbEnums, lotStore, navigate, saveLot, sessionTimeout) {
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

      $q.when( api.listLots( query ) ).then( lots => {

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
        if(lotStore.manifestId) {

          $q.when( api.getManifest( lotStore.manifestId ) ).then( resp => {
            lotStore.setInventory(resp.data.manifest.inventory);
          });

        }
        navigate.scanLot( lotId );
      }
    };

    $scope.viewLot = function(lotId) {
      const targetLot = $scope.lots.find(lot => lot._id === lotId);
      if(targetLot) {
        lotStore.save(targetLot);
        if(lotStore.manifestId) {

          $q.when( api.getManifest( lotStore.manifestId ) ).then( resp => {
            lotStore.setInventory(resp.data.manifest.inventory);
          });

        }
        navigate.viewLot( lotId );
      }
    };

    $scope.saveLot = saveLot;

  }
]);
