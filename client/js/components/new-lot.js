import angular from 'angular';

import * as api from '../api';

/******************* New Lot Controller *************************/
angular.module('myApp').controller('NewLotCtrl', [  '$q', '$scope', 'dbEnums', 'listingBuilder', 'lotCategories', 'lotStore', 'messageModal', 'navigate', 'packagingTypeInfoModal', 'sessionTimeout',
  function( $q, $scope, dbEnums, listingBuilder, lotCategories, lotStore, messageModal, navigate, packagingTypeInfoModal, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    $scope.quickLots = listingBuilder.quickLotsBoilerplate;

    $scope.lotTypes = dbEnums.lotType;
    $scope.packagingTypes = dbEnums.packagingType;

    $scope.categories = ['None'].concat(lotCategories.map(x=>x.name));
    $scope.newLotCategory = 'None';

    $scope.marketplaces = ['wholesaleninjas', 'bstock'];

    $scope.newLot = {
      unmanifested: false,
      destinationMarketplace: 'wholesaleninjas',
    };

    $scope.willUploadManifest = false;

    $scope.openPackagingTypeInfo = packagingTypeInfoModal;

    function buildHandleForPrefix(prefix) {
      const today = new Date();//fix time zone to EST

      const categoryDatePrefix = `${prefix}${today.getMonth()+1}.${today.getDate()}.${today.getFullYear()-2000}`;

      const query = {
        handle: { prefix: true, value: categoryDatePrefix }
      };

      // TODO: this really just compares against the most recent lots. Might be better off
      // creating a new API endpoint that validates a proposed handle against the existing DB,
      // perhaps using an mongo aggregate function
      return $q.when( api.listLots( query ) ).then( lots => {
        const handlePattern = new RegExp(`${categoryDatePrefix}-([0-9]+)`);
        const existingLotNumbers = lots.reduce((numbers, lot) => {
          const lotNumberMatch = lot.handle.match(handlePattern);
          if(lotNumberMatch) {
            numbers.add(parseInt(lotNumberMatch[1]));
          }
          return numbers;
        }, new Set());
        let newLotNumber = 1;

        while(existingLotNumbers.has(newLotNumber))
          newLotNumber++;
        return `${categoryDatePrefix}-${newLotNumber}`;
      });
    }


    $scope.setHandleForCategory = function() {
      const categoryObj = lotCategories.find(x=>x.name===$scope.newLotCategory);
      if(categoryObj) {
        buildHandleForPrefix(categoryObj.prefix).then(handle => $scope.newLot.handle = handle);
      }
    };

    $scope.startQuickLot = function(quickLot) {
      buildHandleForPrefix(quickLot.handlePrefix).then(handle=>{
        Object.assign($scope.newLot, {
          handle: handle,
          unmanifested: true,
        });
        Object.assign($scope.newLot, quickLot.template);
        $scope.startLot();
      });
    };

    $scope.startCustomLot = function() {
      $scope.noHandleSubmitted = !$scope.newLot.handle;
      $scope.noLotTypeSubmitted = !$scope.newLot.type;
      $scope.noPackagingTypeSubmitted = !$scope.newLot.packagingType;

      if ($scope.noHandleSubmitted || $scope.noLotTypeSubmitted || $scope.noPackagingTypeSubmitted ) {
        return;
      }

      $scope.startLot();
    };

    $scope.startLot = function() {
      if(!$scope.newLot.listingData) {
        listingBuilder.buildFromCategory($scope.newLot);
      }
      $q.when( api.createLot( $scope.newLot ) ).then( resp => {
        if( resp.error ) {
          console.error( resp.error );
        }
        else if ( resp.lotExists ) {
          messageModal.launch({header: 'Error', body: `A lot with handle ${$scope.newLot.handle} already exists.`, type: 'error'});
        }
        else{
          const lot = resp;
          lotStore.save(lot);
          if(lot.unmanifested) {
            navigate.viewLot( lotStore._id );
          }
          else {
            if($scope.willUploadManifest) {
              navigate.uploadLotManifest( lotStore._id );
            }
            else {
              navigate.scanLot( lotStore._id );
            }
          }
        }
      });
    };
  }
]);