import angular from 'angular';

/******************* View Lot Controller *************************/
angular.module('myApp').controller('ViewLotCtrl', [ '$scope', '$uibModal', 'ConfirmationModal', 'ImageSvc', 'listingsBoilerplate', 'ListingsSvc', 'LoggedInUser', 'lotStore', 'LotSvc', 'messageModal', 'navigate', 'PrintSvc', 'sessionTimeout', 'shippingItemsModal',
  function( $scope, $uibModal, ConfirmationModal, ImageSvc, listingsBoilerplate, ListingsSvc, LoggedInUser, lotStore, LotSvc, messageModal, navigate, PrintSvc, sessionTimeout, shippingItemsModal ) {
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
        navigate.reload();
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
        navigate.reload();
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
          navigate.reload();
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
        controller: 'EditLotModalCtrl as $ctrl',
        backdrop: 'static',
        resolve: {
          lot: function () {
            return lotStore;
          }
        },
      });

      modalInstance.result.then( lot => {

        LotSvc.edit( lot._id, lot ).then( lot =>{
          console.log( lot );
          navigate.reload();
        });

      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };

    $scope.editImage = (image) => {
      if(image.s3) {
        ImageSvc.setStore(image);
        navigate.imageEditor();
      }
      else {
        messageModal.launch({header: 'Error', body: 'This image cannot be edited.', type: 'error'});
      }
    };

    $scope.scanItems = function() {
      let manP;
      if( lotStore.manifestId ) {
        manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
          lotStore.setInventory( manifest.inventory );
        });
      }

      manP ? manP.then( _ => navigate.scanLot() ) : navigate.scanLot();

    };

    $scope.editManifest = function() {
      let manP;
      if(lotStore.manifestId) {
        manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
          lotStore.setInventory( manifest.inventory );
        });
      }

      manP ? manP.then( _ => navigate.editLotManifest() ) : navigate.editLotManifest();

    };

    $scope.linkManifestBlock = function() {
      $scope.waitingForResponse = true;
      LotSvc.import3rdPartyManifestBlock( { lot: lotStore, blockId: $scope.searchBlockId } ).then( resp => {

        if(resp.data.error) {
          messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'});
        }
        $scope.waitingForResponse = false;
        navigate.reload();

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
        navigate.submitListing();
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
        LotSvc.delete( lotId );
        navigate.listLots();
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };

    $scope.readableDate = function(date) {
      return (new Date(date)).toLocaleString();
    };

    $scope.openGallery = function() {
      navigate.lotGallery( lotStore._id );
    };

    const editShippingItems = function() {
      return shippingItemsModal
        .launch()
        .then(shippingItems => {
          if(shippingItems) {
            lotStore.shippingItems = shippingItems;
            return LotSvc.edit( lotStore._id , lotStore ).then( _lot => {
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

      LotSvc.generateManifest( $scope.lot._id, true, false ).then( () => {
        navigate.reload();
      });

    };


    $scope.openRecentImageGallery = function() {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_past_images_gallery_modal.html',
        size: 'lg',
        controller: 'PastImagesGalleryModalCtrl as $ctrl',
        backdrop: 'static',
      });

      modalInstance.result.then(function ( res ) {

        if( res.images.length ) {

          LotSvc.cloneImages( lotStore._id, res.images ).then( resp => {
            console.log(resp);
            navigate.reload();
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

      LotSvc.cloneImages( lotStore._id, [ url ] ).then( resp => {
        console.log(resp);
        navigate.reload();
      });

    }

    function init() {

      LotSvc.load()
        .then( lot =>{
          $scope.images = lot.images;
          initializeAllThumbnailImages( lot );
        })
        .then( _ => $scope.titleTooLong = ListingsSvc.isTitleTooLong($scope.lot.listingData.title) );

    }

    init();

  }]
);
