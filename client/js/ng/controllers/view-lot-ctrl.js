import angular from 'angular';

import * as util from '../../utilities';

const __MAX_DISPLAY_INVENTORY__ = 50;

/******************* View Lot Controller *************************/
angular.module('myApp').controller( 'ViewLotCtrl', [

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

    async function removeImage( image ) {

      const isConfirmed = await ModalSvc.confirm( {
        header: 'Remove Image',
        body: 'Are you sure you want to remove this image?',
      } );

      if( isConfirmed ) {

        await ModalSvc.wait( {
          waitFor: ImageSvc.removeLotImage( vm.lot._id, image )
        } );

        navigate.reload();

      }

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


    async function editLot() {

      await ModalSvc.editLot( vm.lot );
      navigate.reload();

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

    async function deleteLot() {

      const isConfirmed = await ModalSvc.confirm( {
        header: 'Delete Lot',
        body: 'Are you sure you want to delete this lot?',
      } );

      if( isConfirmed ) {

        await ModalSvc.wait( {
          waitFor: LotSvc.delete( vm.lot._id ),
        } );

        navigate.listLots();

      }

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

    async function openRecentImageGallery() {

      const { images } = await ModalSvc.pastImagesGallery();

      if( images.length ) {

        await LotSvc.cloneImages( vm.lot._id, images );
        navigate.reload();

      }

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
