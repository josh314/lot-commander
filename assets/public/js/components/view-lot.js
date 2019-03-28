(function() {
  'use strict';
  /************************************************************************
  ************************ Angular app ************************************
  *************************************************************************/
  var app = angular.module('myApp');

  /******************* View Lot Controller *************************/
  app.controller('ViewLotCtrl', ['$http', '$scope', '$state', '$stateParams', '$uibModal', 'fileUpload', 'listingsBoilerplate', 'listingTitleVerifier', 'lotStore', 'messageModal', 'sessionTimeout',
    function($http, $scope, $state, $stateParams, $uibModal, fileUpload, listingsBoilerplate, listingTitleVerifier, lotStore, messageModal, sessionTimeout) {   
      sessionTimeout.timeoutExpired();
      $scope.lot = lotStore;
      $scope.listingsBoilerplate = listingsBoilerplate;
      $scope.waitingForResponse = false;

      function getLot() {
        $http.get('/api/db/get/' + $stateParams.lotId).then(resp=>{
          const lot = resp.data;
          lotStore.save(lot);
          $scope.images = lot.images;
          if(lot.manifestId) {
            $http.get('/api/db/manifest/'+lot.manifestId).then(resp=>{
              lotStore.setInventory(resp.data.manifest.inventory);
            });
          }
          $scope.titleTooLong = listingTitleVerifier.tooLong($scope.lot.listingData.title);
          console.log(lotStore);
        });
      }
      getLot();

      $scope.getImageLink = function(image) {
        return image.filename;
      }

      $scope.updatePrimaryImage = function(image) {
        $http.post('/api/image/primary', {lotId: $scope.lot._id, primaryImage: image}).then(resp=>{
          if(!resp.error) {
            $state.reload();
          }
        })
      };

      $scope.uploadImages = function(){
        if($scope.imagesToUpload && $scope.imagesToUpload.length>0) {
          for(let i=0; i<$scope.imagesToUpload.length; i++) {
            const image = $scope.imagesToUpload[i];
            const uploadUrl = "/api/image/upload";
            const metadata = { lotId: lotStore._id, primary: false };
            fileUpload.uploadFileToUrl(image, uploadUrl, metadata).then(resp=>{
              if(i+1==$scope.imagesToUpload.length) {
                $state.reload();
              }
            });
          }
        }
      };

      $scope.editLot = function() {
        const modalInstance = $uibModal.open({
          templateUrl: '/partials/_edit_lot_modal.html',
          size: 'lg',
          controller: 'EditLotModalController', 
          resolve: {
            lot: function () {
              return lotStore;
            }
          },
        });

        modalInstance.result.then(function (lot) {
          $http.post('/api/db/edit-lot/'+lotStore._id, lot).then(resp=>{
            console.log(lot);
            $state.reload();
          });
        }, function () {
          console.log('Modal dismissed at: ' + new Date());
        });
      }

      $scope.scanItems = function() {
        if(lotStore.manifestId) {
          $http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
            lotStore.setInventory(resp.data.manifest.inventory);
          })
        }
        $state.go('main.lots.scan');
      }

      $scope.editManifest = function() {
        if(lotStore.manifestId) {
          $http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
            lotStore.setInventory(resp.data.manifest.inventory);
          })
        }
        $state.go('main.lots.edit-manifest');
      }

      $scope.removeImage = function(image) {
        const data = {
          lotId: $scope.lot._id,
          image: image
        };
        $http.post('/api/image/remove', data).then(resp=>{
          if(!resp.data.error) {
            $state.reload();
          }
          else {
            messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'})
          }
        })
      }

      $scope.linkManifestBlock = function() {
        $scope.waitingForResponse = true;
        $http.post('/api/db/import-3p-manifest-block', { lot: lotStore, blockId: $scope.searchBlockId}).then(resp=>{
          if(resp.data.error) {
            messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'})
          }
          $scope.waitingForResponse = false;
          $state.reload();
        });
      };

      $scope.configureListingForSubmission = function() {
        const missingFields = [];
        if(!$scope.lot.listingData.title) {
          missingFields.push('title')
        }
        if(!$scope.lot.listingData.body) {
          missingFields.push('body')
        }
        if(!$scope.lot.getHandle()) {
          missingFields.push('handle')
        }

        if(!missingFields.length) {
          $state.go('main.lots.submit-listing');
        }
        else {
          const msg = `Must complete the following fields before submission: ${missingFields}`;
          messageModal.launch({Header: 'Incomplete Lot', body: msg , type: 'error'})
        }
      };

      $scope.deleteLot = function(lotId) {
        const modalInstance = $uibModal.open({
          templateUrl: '/partials/_delete_lot_modal.html',
          size: 'lg',
        });

        modalInstance.result.then(function () {
          $http.post('/api/db/delete-lot/', {lotId: lotId});
          $state.go('main.lots.list');
        }, function () {
          console.log('Modal dismissed at: ' + new Date());
        });
      }

      $scope.readableDate = function(date) {
        return (new Date(date)).toLocaleString();
      }

      $scope.printLabels = function() {
        if(lotStore.getNumBoxes()) {
          printJS(`/api/labels/${encodeURIComponent(lotStore.handle)}/${lotStore.getNumBoxes()}`);
        }
        else {
          const modalInstance = $uibModal.open({
            templateUrl: '/partials/_set_num_boxes_modal.html',
            size: 'lg',
            controller: 'SetNumBoxesModalController', 
            resolve: {
              lot: function () {
                return lotStore;
              }
            },
          });
          modalInstance.result.then(function (lot) {
            $http.post('/api/db/edit-lot/'+lotStore._id, lot).then(resp=>{
              console.log(lot);
              printJS(`/api/labels/${encodeURIComponent(lot.handle)}/${lot.numBoxes}`);
              $state.reload();
            });
          }, function () {
            $state.reload();
          });
        }
      };

  }]);

  /***************** Modal Controllers ************************/
  app.controller('EditLotModalController', [ '$scope', 'dbEnums', 'listingTitleVerifier',  'lot', function($scope, dbEnums, listingTitleVerifier, lot){
    $scope.lot = JSON.parse(JSON.stringify(lot));
    $scope.lotStatusEnum = dbEnums.lotStatus;
    $scope.lotTypeEnum = dbEnums.lotType;
    $scope.selectedListing = 'bstock';

    $scope.titleTooLong = {};
    $scope.verifyTitle = () => {
      $scope.titleTooLong = listingTitleVerifier.tooLong($scope.lot.listingData.title);
    };
    $scope.verifyTitle();

    $scope.invalidLot = lot => {
      return $scope.titleTooLong.bstock || $scope.titleTooLong.shopify || $scope.lot.numBoxes < 0;
    } 
  }]);

  /***************** Modal Controllers ************************/
  app.controller('SetNumBoxesModalController', [ '$scope', 'lot', function($scope, lot){
    $scope.lot = JSON.parse(JSON.stringify(lot));

    $scope.invalidLot = lot => {
      return $scope.lot.numBoxes < 0;
    } 
  }]);


})();