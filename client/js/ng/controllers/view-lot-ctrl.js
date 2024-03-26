import angular from 'angular';

import * as util from '../../utilities';

const __MAX_DISPLAY_INVENTORY__ = 50;

/******************* View Lot Controller *************************/
angular.module('myApp').controller( 'ViewLotCtrl', [

  '$uibModal',
  'ImageSvc',
  'InventoryPalletManagerSvc',
  'listingsBoilerplate',
  'ListingsSvc',
  'LoggedInUser',
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
    LotSvc,
    ModalSvc,
    navigate,
    PrintSvc,
    sessionTimeout,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          showEditingControls: LoggedInUser.hasPermission( 'EDIT_LOT' ),
          showDeleteButton: LoggedInUser.hasPermission( 'DELETE_LOT' ),
          showPricingData: LoggedInUser.hasPermission( 'VIEW_PRICING_DATA' ),
          waitingForResponse: false,

          listingsBoilerplate,

          // images methods
          updatePrimaryImage,
          uploadImages,
          removeImage,
          editImage,
          addLotImageMethod: 'file',
          setAddLotImageMethod: s => vm.addLotImageMethod = s,
          addLotImageMethodIs: s => ( vm.addLotImageMethod === s ),
          openImagePreviewModal,


          // Lot editing
          editLot,
          editShippingItemsCb,
          deleteLot,


          // shipping items display
          showShippingItems: false,
          toggleShowShippingItems: () => vm.showShippingItems = !vm.showShippingItems,


          configureListingForSubmission,
          scanItems,
          editManifest,
          linkManifestBlock,
          openGallery,
          printShippingItemsLabels,
          generateManifestFileForScannedInventory,
          openRecentImageGallery,
          confirmAddLotImage,
          cloneImageFromSelectedUrl: () => cloneImageFromUrl( vm.imageUrlToClone ),
          showPalletDetails,

          getBodyHtml,

          pagination:{
            current: 1,
            totalItems: 0,
            pageSize: __MAX_DISPLAY_INVENTORY__,
            pageChange: refreshDisplayInventory,
            maxSize: 8
          },

          // export modules
          util,

        }
      );


      LotSvc.load( { populate: ['pallet'] } )
        .then( lot => {

          vm.lot = lot;

          vm.images = lot.images;
          refreshDisplayInventory();
        } )
        .then( _ => vm.titleTooLong = ListingsSvc.isTitleTooLong( vm.lot.listingData.title ) );

    }


    /*************************************************
    * Images
    * =========
    *
    ************/

    const initializeAllThumbnailImages = () => {
      const limit = Math.min( vm.displayInventory.length, __MAX_DISPLAY_INVENTORY__ );

      for(let i=0; i < limit; i++) {
        const item = vm.displayInventory[i];
        ImageSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
      }
    };

    function refreshDisplayInventory() {
      const sortedInventory = vm.lot.getInventorySortedByBarcode();
      vm.pagination.totalItems = sortedInventory.length;
      const start = ( vm.pagination.current - 1 ) * __MAX_DISPLAY_INVENTORY__;
      const end = start + __MAX_DISPLAY_INVENTORY__;
      vm.displayInventory = sortedInventory.slice( start, end );
      initializeAllThumbnailImages();
    }

    // Manage images
    async function updatePrimaryImage( imageId ) {
      const resp = await ImageSvc.updateLotPrimaryImage( vm.lot._id, imageId );
      if(!resp.error) {
        navigate.reload();
      }
      else {
        ModalSvc.message( { header: 'Error', body: resp.error, type: 'error' } );
      }
    }

    function uploadImages() {

      return ModalSvc.wait( {
        waitFor: vm.lot.uploadImages( vm.imagesToUpload ),
        message: 'Uploading images...',
      } );

    }

    function removeImage(image) {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_remove_image_modal.html',
        size: 'lg',
        backdrop: 'static',
      });

      modalInstance.result.then(async function () {
        const resp = await ImageSvc.removeLotImage( vm.lot._id, image);
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

    function openImagePreviewModal( image ) {
      ModalSvc.imagePreview( vm.lot.getImageLink( image ) );
    }


    /*************************************************
    * Editing
    * =========
    *
    ************/


    function editLot() {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_edit_lot_modal.html',
        size: 'lg',
        controller: 'EditLotModalCtrl as $ctrl',
        backdrop: 'static',
        resolve: {
          lot: function () {
            return JSON.parse( JSON.stringify( vm.lot ) ); // deep clone of lot so edits are ephemeral before save
          }
        },
      });

      modalInstance.result.then( lot => {

        if( !lot.category ) {
          lot.category = '';
        }

        LotSvc.edit( lot._id, lot ).then( _lot =>{
          navigate.reload();
        });

      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }


    function scanItems() {

      navigate.scanLot( vm.lot._id );

    }

    function editManifest() {

      navigate.editLotManifest( vm.lot._id );

    }

    function linkManifestBlock() {
      vm.waitingForResponse = true;
      LotSvc.import3rdPartyManifestBlock( { lot: vm.lot, blockId: vm.searchBlockId } ).then( resp => {

        if(resp.data.error) {
          ModalSvc.message( { header: 'Error', body: resp.data.error, type: 'error' } );
        }
        vm.waitingForResponse = false;
        navigate.reload();

      });
    }

    const validateShippingItems = () => {
      if( !vm.lot.shippingItems || vm.lot.shippingItems.length <=0 ) {
        return false;
      }

      return vm.lot.shippingItems.every(item => {
        return parseInt(item.weight) && item.weightUnits &&
          parseInt(item.height) && item.heightUnits &&
          parseInt(item.length) && item.lengthUnits &&
          parseInt(item.width) && item.widthUnits;
      });
    };

    async function configureListingForSubmission() {

      if( vm.lot.hasListing() ) {
        const isConfirmed = await ModalSvc.confirm( { header: 'Lot has listing', body: 'This lot already has a successfully submitted listing. Proceed anyway?', type: 'warning' } );

        if( !isConfirmed ) {
          return;
        }

      }

      if( !LoggedInUser.hasMarketplacePermission( vm.lot.destinationMarketplace ) ) {
        let msg = `User is not authorized to submit to marketplace: ${vm.lot.destinationMarketplace}. Choose another marketplace.`;
        ModalSvc.message( { header: 'Unauthorized marketplace', body: msg , type: 'error' } );
        return;
      }

      const missingFields = [];
      if( !vm.lot.listingData.title ) {
        missingFields.push('title');
      }
      if( !vm.lot.listingData.body ) {
        missingFields.push('body');
      }
      if( !vm.lot.handle ) {
        missingFields.push('handle');
      }
      if( !vm.lot.packagingType ) {
        missingFields.push('packaging type');
      }
      if( !vm.lot.numBoxes && !validateShippingItems() ) {
        missingFields.push('shipping items');
      }
      if( vm.images.length <= 0 ) {
        missingFields.push('images');
      }

      if( !missingFields.length ) {
        navigate.submitListing( vm.lot._id );
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
        backdrop: 'static',
      });

      modalInstance.result.then(function () {
        LotSvc.delete( lotId );
        navigate.listLots();
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }

    function openGallery() {
      navigate.lotGallery( vm.lot._id );
    }

    function editShippingItemsCb (shippingItems) {
      if(shippingItems) {
        vm.lot.shippingItems = shippingItems;
        return LotSvc.edit( vm.lot._id , vm.lot ).then( _lot => {
          navigate.reload();
        });
      }
      else {
        return false;
      }
    }

    function generateManifestFileForScannedInventory() {

      LotSvc.generateManifest( vm.lot._id, true, false ).then( () => {
        navigate.reload();
      });

    }

    function printShippingItemsLabels() {

      if( !vm.lot.shippingItems || vm.lot.shippingItems.length === 0 ) {
        return ModalSvc.message( {
          header: 'Nothing to print',
          html: `<p>The split group <strong>${ vm.lot.label }</strong> has no shipping items configured.</p>`,
          type: 'warning'
        } );
      }

      PrintSvc.printLotShippingItemsLabels( vm.lot._id );

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

          LotSvc.cloneImages( vm.lot._id, res.images ).then( resp => {
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

      LotSvc.cloneImages( vm.lot._id, [ url ] ).then( resp => {
        console.log(resp);
        navigate.reload();
      });

    }

    function showPalletDetails() {
      InventoryPalletManagerSvc.get( vm.lot.pallet._id, { populate: [ 'shipment', 'splitFrom' ] } ).then( pallet => pallet.detailsModal() );
    }

    function getBodyHtml() {
      if( vm.lot ) {
        return vm.lot.getBodyHtml();
      }
    }


  }]
);
