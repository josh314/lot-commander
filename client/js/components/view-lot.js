import angular from 'angular';

import * as api from '../api';

/******************* View Lot Controller *************************/
angular.module('myApp').controller('ViewLotCtrl', [ '$q', '$scope', '$state', '$uibModal', 'ConfirmationModal', 'ImageSvc', 'listingsBoilerplate', 'listingTitleVerifier', 'loadLot', 'lotStore', 'messageModal', 'PrintSvc', 'saveLot', 'sessionTimeout', 'shippingItemsModal', 'LoggedInUser',
  function( $q, $scope, $state, $uibModal, ConfirmationModal, ImageSvc, listingsBoilerplate, listingTitleVerifier, loadLot, lotStore, messageModal, PrintSvc, saveLot, sessionTimeout, shippingItemsModal, LoggedInUser) {
    sessionTimeout.timeoutExpired();

    $scope.showCreateListingButton = LoggedInUser.hasPermission('SUBMIT_AUCTION') || LoggedInUser.hasPermission('SUBMIT_SHOPIFY_LISTING');

    $scope.lot = lotStore;
    $scope.listingsBoilerplate = listingsBoilerplate;
    $scope.waitingForResponse = false;

    $scope.showShippingItems = false;
    $scope.toggleShowShippingItems = () => $scope.showShippingItems = !$scope.showShippingItems;

    $scope.addLotImageMethod = 'file';
    $scope.setAddLotImageMethod = s => $scope.addLotImageMethod = s;
    $scope.addLotImageMethodIs = s => ( $scope.addLotImageMethod === s );

    const initializeAllThumbnailImages = () => {
      for(let i=0; i<lotStore.inventory.length; i++) {
        const item = lotStore.inventory[i];
        ImageSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
      }
    };

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
      let manP;
      if(lotStore.manifestId) {
        manP = $q.when( api.getManifest( lotStore.manifestId ) ).then( manifest =>{
          lotStore.setInventory( manifest.inventory );
        });
      }
      else {
        manP = $q.when( null );
      }
      manP.then( _ => $state.go('main.lots.scan') );
    };

    $scope.editManifest = function() {
      let manP;
      if(lotStore.manifestId) {
        manP = $q.when( api.getManifest( lotStore.manifestId ) ).then( manifest =>{
          lotStore.setInventory( manifest.inventory );
        });
      }
      else {
        manP = $q.when( null );
      }
      manP.then( _ => $state.go('main.lots.edit-manifest') );
    };

    $scope.linkManifestBlock = function() {
      $scope.waitingForResponse = true;
      $q.when( api.import3rdPartyManifestBlock({ lot: lotStore, blockId: $scope.searchBlockId}) ).then(resp=>{
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
        api.deleteLot( lotId );
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
            return saveLot(lotStore).then( _resp => {
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
      const isPrinting = PrintSvc.printLotLabels( lotStore );
      if(!isPrinting) {
        editShippingItems().then(isEdited=>{
          if(isEdited) {
            PrintSvc.printLotLabels( lotStore );
          }
        });
      }
    };

    $scope.generateManifestFileForScannedInventory = function() {
      $q.when( api.generateLotManifest( $scope.lot._id, true, false) ).then( () => {
        $state.reload();
      });
    };


    $scope.openRecentImageGallery = function() {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_past_images_gallery_modal.html',
        size: 'lg',
        controller: 'PastImagesGalleryModalController',
        controllerAs: '$ctrl',
        backdrop: 'static',
      });

      modalInstance.result.then(function ( res ) {

        if( res.images.length ) {
          api.cloneImages( lotStore._id, res.images ).then(resp=>{
            console.log(resp);
            $state.reload();
          });
        }

      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };

    $scope.cloneImageFromUrl = () => {
      
      return cloneImageFromUrl( $scope.imageUrlToClone );

    };

    $scope.confirmAddLotImage = ( event ) =>{

      const imgUrl = event.target.currentSrc;

      ConfirmationModal.launch({
        header: "Add Image",
        body: "Add this as a lot image?",
        html: `<img src="${ imgUrl }" />`
      }).then( isConfirmed => {

        if( isConfirmed ) {

          return cloneImageFromUrl( imgUrl );

        }

      } );

    };

    function cloneImageFromUrl( url ) {
          
      if( !url ) { // TODO: check if valid URL
        return;
      }

      api.cloneImages( lotStore._id, [ url ] ).then(resp=>{
        console.log(resp);
        $state.reload();
      });

    }

    function init() {

      loadLot()
        .then( lot =>{
          $scope.images = lot.images;
          initializeAllThumbnailImages( lot );
        })
        .then( _ => $scope.titleTooLong = listingTitleVerifier.tooLong($scope.lot.listingData.title) );

    }

    init();

  }]
);

/*************************************************************/
/****************** Modal Controllers ************************/
/******************                   ************************/
/*************************************************************/
/*************************************************************/

/****************** Edit Lot ***********************/
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


/****************** Past images ***********************/
angular.module('myApp').controller('PastImagesGalleryModalController', [ '$q', '$uibModalInstance', 'ImageSvc',
  function( $q, $uibModalInstance, ImageSvc ){

    const vm = this;

    const __PAGE_SIZE__ = 100;

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __PAGE_SIZE__,
      pageChange: refreshDisplayList
    };

    const loadImages = () => {

      $q.when( ImageSvc.getImageList( { urlEncode: true } ) ).then( resp => {

        vm.images = resp.images.map( _ => ({ link: _, selected: false }) );
        vm.pagination.totalItems = vm.images.length;

        refreshDisplayList();

        vm.waitingToLoad = false;
      });

    };

    vm.confirmSelected = () => {

      const selectedImages = vm.images.filter( _ => _.selected ).map( _ => _.link );

      $uibModalInstance.close( { images: selectedImages } );

    };

    function refreshDisplayList( ) {
      const begin = __PAGE_SIZE__ * ( vm.pagination.current - 1 );
      const end = __PAGE_SIZE__ * ( vm.pagination.current );
      vm.displayList = vm.images.slice( begin, end );
    }

    const init = () => {
      vm.waitingToLoad = true;
      loadImages();
    };
    init();

  }
]);
