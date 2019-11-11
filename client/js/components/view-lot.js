import angular from 'angular';

/******************* View Lot Controller *************************/
angular.module('myApp').controller('ViewLotCtrl', ['$http', '$scope', '$state', '$stateParams', '$uibModal', 'ImageSvc', 'listingsBoilerplate', 'listingTitleVerifier', 'lotStore', 'messageModal', 'PrintSvc', 'saveLot', 'sessionTimeout', 'shippingItemsModal',
  function($http, $scope, $state, $stateParams, $uibModal, ImageSvc, listingsBoilerplate, listingTitleVerifier, lotStore, messageModal, PrintSvc, saveLot, sessionTimeout, shippingItemsModal) {
    sessionTimeout.timeoutExpired();
    $scope.lot = lotStore;
    $scope.listingsBoilerplate = listingsBoilerplate;
    $scope.waitingForResponse = false;

    $scope.showShippingItems = false;
    $scope.toggleShowShippingItems = () => $scope.showShippingItems = !$scope.showShippingItems;

    const initializeAllThumbnailImages = () => {
      for(let i=0; i<lotStore.inventory.length; i++) {
        const item = lotStore.inventory[i];
        ImageSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
      }
    };

    function getLot() {
      return $http.get('/api/db/get/' + $stateParams.lotId).then(async (resp)=>{
        const lot = resp.data;
        lotStore.save(lot);
        $scope.images = lot.images;
        if(lot.manifestId) {
          await $http.get('/api/db/manifest/'+lot.manifestId).then(resp=>{
            lotStore.setInventory(resp.data.manifest.inventory);
          });
        }
        $scope.titleTooLong = listingTitleVerifier.tooLong($scope.lot.listingData.title);
      });
    }
    getLot().then(_=>{
      initializeAllThumbnailImages(_);
    });

    $scope.getImageLink = function(image) {
      return image.s3 ? `/api/image/?s3=${encodeURIComponent(image.s3)}` : image.filename;
    };

    // Manage images
    $scope.updatePrimaryImage = async (image) => { 
      const resp = await ImageSvc.updateLotPrimaryImage($scope.lot, image);
      if(!resp.error) {
        $state.reload();
      }
      else {
        messageModal.launch({header: 'Error', body: resp.error, type: 'error'});
      }
    };
    $scope.uploadImages = async () => { 
      const resp = await ImageSvc.uploadLotImages($scope.lot, $scope.imagesToUpload);
      if(resp.error) {
        console.log(resp);
      }
      else {
        $state.reload();
      }
    };
    $scope.removeImage = (image) => {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_remove_image_modal.html',
        size: 'lg',
      });

      modalInstance.result.then(async function () {
        const resp = await ImageSvc.removeLotImage($scope.lot, image);
        if(!resp.data.error) {
          $state.reload();
        }
        else {
          messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'});
        }
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };

    $scope.editLot = function() {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_edit_lot_modal.html',
        size: 'lg',
        controller: 'EditLotModalController',
        backdrop: 'static',
        resolve: {
          lot: function () {
            return lotStore;
          }
        },
      });

      modalInstance.result.then(function (lot) {
        saveLot(lot).then(resp=>{
          console.log(resp);
          $state.reload();
        });
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };

    $scope.editImage = (image) => {
      if(image.s3) {
        ImageSvc.setStore(image);
        $state.go('main.lots.image-editor');
      }
      else {
        messageModal.launch({header: 'Error', body: 'This image cannot be edited.', type: 'error'});
      }
    };

    $scope.scanItems = function() {
      if(lotStore.manifestId) {
        $http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
          lotStore.setInventory(resp.data.manifest.inventory);
        });
      }
      $state.go('main.lots.scan');
    };

    $scope.editManifest = function() {
      if(lotStore.manifestId) {
        $http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
          lotStore.setInventory(resp.data.manifest.inventory);
        });
      }
      $state.go('main.lots.edit-manifest');
    };

    $scope.linkManifestBlock = function() {
      $scope.waitingForResponse = true;
      $http.post('/api/db/import-3p-manifest-block', { lot: lotStore, blockId: $scope.searchBlockId}).then(resp=>{
        if(resp.data.error) {
          messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'});
        }
        $scope.waitingForResponse = false;
        $state.reload();
      });
    };

    const validateShippingItems = () => {
      if(!$scope.lot.shippingItems || $scope.lot.shippingItems.length <=0 ) {
        return false;
      }

      return $scope.lot.shippingItems.every(item => {
        return parseInt(item.weight) && item.weightUnits &&
          parseInt(item.height) && item.heightUnits &&
          parseInt(item.length) && item.lengthUnits &&
          parseInt(item.width) && item.widthUnits;
      });
    };

    $scope.configureListingForSubmission = function() {
      const missingFields = [];
      if(!$scope.lot.listingData.title) {
        missingFields.push('title');
      }
      if(!$scope.lot.listingData.body) {
        missingFields.push('body');
      }
      if(!$scope.lot.getHandle()) {
        missingFields.push('handle');
      }
      if(!$scope.lot.numBoxes && !validateShippingItems() ) {
        missingFields.push('shipping items');
      }
      if($scope.images.length <= 0) {
        missingFields.push('images');
      }


      if(!missingFields.length) {
        $state.go('main.lots.submit-listing');
      }
      else {
        const msg = `Must input the following data before submission: ${missingFields}`;
        messageModal.launch({Header: 'Incomplete Lot', body: msg , type: 'error'});
      }
    };

    $scope.deleteLot = function(lotId) {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_delete_lot_modal.html',
        size: 'lg',
      });

      modalInstance.result.then(function () {
        $http.post('/api/db/delete-lot/', {lotId: lotId});
        $state.go('main.lots.list');
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };

    $scope.readableDate = function(date) {
      return (new Date(date)).toLocaleString();
    };

    $scope.openGallery = function() {
      $state.go('main.lots.gallery', { lotId: lotStore._id });
    };

    const editShippingItems = function() {
      return shippingItemsModal
        .launch()
        .then(shippingItems => {
          if(shippingItems) {
            lotStore.shippingItems = shippingItems;
            return saveLot(lotStore).then( resp => {
              return true;
            });
          }
          else {
            return false;
          }
        });
    };
    $scope.editShippingItems = editShippingItems;

    $scope.printLabels = function() {
      const isPrinting = PrintSvc.printLabels();
      if(!isPrinting) {
        editShippingItems().then(isEdited=>{
          if(isEdited) {
            PrintSvc.printLabels();
          }
        });
      }
    };
  }]
);

/***************** Modal Controllers ************************/
angular.module('myApp').controller('EditLotModalController', [ '$scope', 'dbEnums', 'listingTitleVerifier', 'lot', 'packagingTypeInfoModal', 'shippingItemsModal',
  function($scope, dbEnums, listingTitleVerifier, lot, packagingTypeInfoModal, shippingItemsModal){
    $scope.lot = JSON.parse(JSON.stringify(lot));
    $scope.lotStatusEnum = dbEnums.lotStatus;
    $scope.lotTypeEnum = dbEnums.lotType;
    $scope.packagingTypeEnum = dbEnums.packagingType;
    // $scope.selectedListing = 'bstock';
    $scope.marketplaces = [undefined].concat(dbEnums.marketplaces);

    $scope.titleTooLong = {};
    $scope.verifyTitle = () => {
      $scope.titleTooLong = listingTitleVerifier.tooLong($scope.lot.listingData.title);
      if($scope.titleTooLong.bstock && $scope.lot.destinationMarketplace==='bstock') {
        return false;
      }
      if($scope.titleTooLong.shopify && $scope.lot.destinationMarketplace==='wholesaleninjas') {
        return false;
      }
      return true;
    };
    $scope.verifyTitle();

    $scope.invalidLot = () => {
      return !$scope.verifyTitle() || $scope.lot.numBoxes < 0;
    };

    $scope.openPackagingTypeInfo = packagingTypeInfoModal;

    $scope.editShippingItems = function() {
      shippingItemsModal
        .launch()
        .then(shippingItems => {
          if(shippingItems) {
            $scope.lot.shippingItems = shippingItems;
          }
        });
    };
  }
]);
