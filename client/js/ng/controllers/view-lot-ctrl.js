import angular from 'angular';

/******************* View Lot Controller *************************/
angular.module('myApp').controller( 'ViewLotCtrl', [

  '$uibModal',
  'ImageSvc',
  'InventoryPalletManagerSvc',
  'listingsBoilerplate',
  'ListingsSvc',
  'LoggedInUser',
  'lotStore',
  'LotSvc',
  'ModalSvc',
  'navigate',
  'PrintSvc',
  'sessionTimeout',

  function(

    $uibModal,
    ImageSvc,
    InventoryPalletManagerSvc,
    listingsBoilerplate,
    ListingsSvc,
    LoggedInUser,
    lotStore,
    LotSvc,
    ModalSvc,
    navigate,
    PrintSvc,
    sessionTimeout,

  ) {

    sessionTimeout.timeoutExpired();

    function userHasMarketplacePermission( marketplace ) {

      if( marketplace === 'wholesaleninjas' ) {
        return LoggedInUser.hasPermission( 'SUBMIT_SHOPIFY_LISTING' );
      }

      if( marketplace === 'bstock' ) {
        return LoggedInUser.hasPermission( 'SUBMIT_AUCTION' );
      }

      return false;

    }

    const vm = this;

    vm.showEditingControls = LoggedInUser.hasPermission( 'EDIT_LOT' );
    vm.showDeleteButton = LoggedInUser.hasPermission( 'DELETE_LOT' );
    vm.waitingForResponse = false;

    vm.listingsBoilerplate = listingsBoilerplate;

    // images methods
    vm.getImageLink = getImageLink;
    vm.updatePrimaryImage = updatePrimaryImage;
    vm.uploadImages = uploadImages;
    vm.removeImage = removeImage;
    vm.editImage = editImage;

    vm.addLotImageMethod = 'file';
    vm.setAddLotImageMethod = s => vm.addLotImageMethod = s;
    vm.addLotImageMethodIs = s => ( vm.addLotImageMethod === s );

    // Lot editing
    vm.editLot = editLot;
    vm.editShippingItems = editShippingItems;
    vm.deleteLot = deleteLot;

    // shipping items display
    vm.showShippingItems = false;
    vm.toggleShowShippingItems = () => vm.showShippingItems = !vm.showShippingItems;

    vm.configureListingForSubmission = configureListingForSubmission;
    vm.scanItems = scanItems;
    vm.editManifest = editManifest;
    vm.linkManifestBlock = linkManifestBlock;
    vm.readableDate = readableDate;
    vm.openGallery = openGallery;
    vm.printLabels = printLabels;
    vm.generateManifestFileForScannedInventory = generateManifestFileForScannedInventory;
    vm.openRecentImageGallery = openRecentImageGallery;
    vm.confirmAddLotImage = confirmAddLotImage;
    vm.cloneImageFromSelectedUrl = () => cloneImageFromUrl( vm.imageUrlToClone );
    vm.showPalletDetails = showPalletDetails;

    vm.lot = lotStore;

    const initializeAllThumbnailImages = () => {
      for(let i=0; i<lotStore.inventory.length; i++) {
        const item = lotStore.inventory[i];
        ImageSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
      }
    };

    function getImageLink(image) {
      return image.s3 ? `/api/image/?s3=${encodeURIComponent(image.s3)}` : image.filename;
    }

    // Manage images
    async function updatePrimaryImage(image) {
      const resp = await ImageSvc.updateLotPrimaryImage(lotStore, image);
      if(!resp.error) {
        navigate.reload();
      }
      else {
        ModalSvc.message( { header: 'Error', body: resp.error, type: 'error' } );
      }
    }
    async function uploadImages() {
      const resp = await ImageSvc.uploadLotImages(lotStore, vm.imagesToUpload);
      if(resp.error) {
        console.log(resp);
      }
      else {
        navigate.reload();
      }
    }
    function removeImage(image) {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_remove_image_modal.html',
        size: 'lg',
      });

      modalInstance.result.then(async function () {
        const resp = await ImageSvc.removeLotImage(lotStore, image);
        if(!resp.data.error) {
          navigate.reload();
        }
        else {
          ModalSvc.message( { header: 'Error', body: resp.data.error, type: 'error' } );
        }
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }


    function editImage( image ) {
      if(image.s3) {
        ImageSvc.setStore(image);
        navigate.imageEditor();
      }
      else {
        ModalSvc.message( { header: 'Error', body: 'This image cannot be edited.', type: 'error' } );
      }
    }

    function editLot() {
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
    }


    function scanItems() {
      let manP;
      if( lotStore.manifestId ) {
        manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
          lotStore.setInventory( manifest.inventory );
        });
      }

      manP ? manP.then( _ => navigate.scanLot() ) : navigate.scanLot();

    }

    function editManifest() {
      let manP;
      if(lotStore.manifestId) {
        manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
          lotStore.setInventory( manifest.inventory );
        });
      }

      manP ? manP.then( _ => navigate.editLotManifest() ) : navigate.editLotManifest();

    }

    function linkManifestBlock() {
      vm.waitingForResponse = true;
      LotSvc.import3rdPartyManifestBlock( { lot: lotStore, blockId: vm.searchBlockId } ).then( resp => {

        if(resp.data.error) {
          ModalSvc.message( { header: 'Error', body: resp.data.error, type: 'error' } );
        }
        vm.waitingForResponse = false;
        navigate.reload();

      });
    }

    const validateShippingItems = () => {
      if(!lotStore.shippingItems || lotStore.shippingItems.length <=0 ) {
        return false;
      }

      return lotStore.shippingItems.every(item => {
        return parseInt(item.weight) && item.weightUnits &&
          parseInt(item.height) && item.heightUnits &&
          parseInt(item.length) && item.lengthUnits &&
          parseInt(item.width) && item.widthUnits;
      });
    };

    function configureListingForSubmission() {

      if( !userHasMarketplacePermission( lotStore.destinationMarketplace ) ) {
        let msg = `User is not authorized to submit to marketplace: ${lotStore.destinationMarketplace}. Choose another marketplace.`;
        ModalSvc.message( { header: 'Unauthorized marketplace', body: msg , type: 'error' } );
        return;
      }

      const missingFields = [];
      if(!lotStore.listingData.title) {
        missingFields.push('title');
      }
      if(!lotStore.listingData.body) {
        missingFields.push('body');
      }
      if(!lotStore.getHandle()) {
        missingFields.push('handle');
      }
      if(!lotStore.numBoxes && !validateShippingItems() ) {
        missingFields.push('shipping items');
      }
      if(vm.images.length <= 0) {
        missingFields.push('images');
      }


      if(!missingFields.length) {
        navigate.submitListing();
      }
      else {
        let msg = `Must input the following data before submission: ${missingFields}`;
        ModalSvc.message( { header: 'Incomplete Lot', body: msg , type: 'error' } );
      }
    }

    function deleteLot(lotId) {
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
    }

    function readableDate(date) {
      return (new Date(date)).toLocaleString();
    }

    function openGallery() {
      navigate.lotGallery( lotStore._id );
    }

    function editShippingItems() {
      return ModalSvc.shippingItems()
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
    }

    function printLabels() {
      const isPrinting = PrintSvc.printLotLabels( lotStore );
      if(!isPrinting) {
        editShippingItems().then(isEdited=>{
          if(isEdited) {
            PrintSvc.printLotLabels( lotStore );
          }
        });
      }
    }

    function generateManifestFileForScannedInventory() {

      LotSvc.generateManifest( lotStore._id, true, false ).then( () => {
        navigate.reload();
      });

    }


    function openRecentImageGallery() {
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
    }

    function confirmAddLotImage( event ) {

      const imgUrl = event.target.currentSrc;

      ModalSvc.confirm({
        header: "Add Image",
        body: "Add this as a lot image?",
        html: `<img src="${ imgUrl }" />`
      }).then( isConfirmed => {

        if( isConfirmed ) {

          return cloneImageFromUrl( imgUrl );

        }

      } );

    }

    function cloneImageFromUrl( url ) {

      if( !url ) { // TODO: check if valid URL
        return;
      }

      LotSvc.cloneImages( lotStore._id, [ url ] ).then( resp => {
        console.log(resp);
        navigate.reload();
      });

    }

    function showPalletDetails() {
      InventoryPalletManagerSvc.get( vm.lot.pallet._id, { populate: [ 'shipment' ] } ).then( pallet => pallet.detailsModal() );
    }

    function init() {

      LotSvc.load()
        .then( lot =>{
          vm.images = lot.images;
          initializeAllThumbnailImages( lot );
        })
        .then( _ => vm.titleTooLong = ListingsSvc.isTitleTooLong(lotStore.listingData.title) );

    }

    init();

  }]
);
