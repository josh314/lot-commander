import angular from 'angular';

import * as util from '../../utilities';

const __MAX_DISPLAY_INVENTORY__ = 50;

/******************* View Lot Controller *************************/
angular.module('myApp').controller( 'ViewLotCtrl', [

  'InventoryPalletManagerSvc',
  'ListingsSvc',
  'LoggedInUser',
  'LotSvc',
  'MediaSvc',
  'ModalSvc',
  'navigate',
  'sessionTimeout',

  function(

    InventoryPalletManagerSvc,
    ListingsSvc,
    LoggedInUser,
    LotSvc,
    MediaSvc,
    ModalSvc,
    navigate,
    sessionTimeout,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          lot: null,

          showEditingControls: LoggedInUser.hasPermission( 'EDIT_LOT' ),
          showDeleteButton: LoggedInUser.hasPermission( 'DELETE_LOT' ),
          showPricingData: LoggedInUser.hasPermission( 'VIEW_PRICING_DATA' ),
          waitingForResponse: false,


          // media methods
          addLotImageMethod: 'file',
          setAddLotImageMethod: s => vm.addLotImageMethod = s,
          addLotImageMethodIs: s => ( vm.addLotImageMethod === s ),
          uploadMediaCb,

          // Lot editing
          editLot,
          editShippingItemsCb,
          deleteLot,


          // shipping items display
          showShippingItems: false,
          toggleShowShippingItems: () => vm.showShippingItems = !vm.showShippingItems,


          verifyListingAndNavigateToSubmission,
          scanItems,
          reviewManifest,
          linkManifestBlock,
          openGallery,
          generateManifestFileForScannedInventory,
          openRecentImageGallery,
          confirmAddLotImage,
          cloneImageFromSelectedUrl: () => cloneImageFromUrl( vm.imageUrlToClone ),
          showPalletDetails,
          uploadManifestPage,

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


      LotSvc.load( { populate: ['pallet'], pollProcessingMedia: true } )
        .then( lot => {

          vm.lot = lot;

          vm.images = lot.images;
          refreshDisplayInventory();
        } )
        .then( _ => {
          if( vm.lot.hasScannedManifest() && !vm.lot.inventoryHasBrandInfo() ) {
            return ModalSvc.wait( {
              waitFor: vm.lot.guaranteeBrandInfo(),
              message: 'Loading brand info...',
            });
          }
        })
        .then( _ => vm.titleTooLong = ListingsSvc.isTitleTooLong( vm.lot.listingData.title ) );

    }


    /*************************************************
    * Media
    * =====
    *
    ************/

    const initializeAllThumbnailImages = () => {
      const limit = Math.min( vm.displayInventory.length, __MAX_DISPLAY_INVENTORY__ );

      for(let i=0; i < limit; i++) {
        const item = vm.displayInventory[i];
        MediaSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
      }
    };

    function refreshDisplayInventory() {
      const sortedInventory = vm.lot.getInventoryDataSortedByBarcode();
      vm.pagination.totalItems = sortedInventory.length;
      const start = ( vm.pagination.current - 1 ) * __MAX_DISPLAY_INVENTORY__;
      const end = start + __MAX_DISPLAY_INVENTORY__;
      vm.displayInventory = sortedInventory.slice( start, end );
      initializeAllThumbnailImages();
    }

    function uploadMediaCb( files, mediaType ) {
      return vm.lot.uploadMedia( files, mediaType );
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

    function reviewManifest() {

      navigate.reviewLotManifest( vm.lot._id );

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

    async function verifyListingAndNavigateToSubmission() {

      if( vm.lot.hasListing() ) {
        return ModalSvc.message( { header: 'Lot has listing', body: 'This lot already has a successfully submitted listing.' } );
      }

      if( !LoggedInUser.hasMarketplacePermission( vm.lot.destinationMarketplace ) ) {
        let msg = `User is not authorized to submit to marketplace: ${vm.lot.destinationMarketplace}. Choose another marketplace.`;
        return ModalSvc.message( { header: 'Unauthorized marketplace', body: msg , type: 'error' } );
      }

      const missingFields = [];
      if( !vm.lot.handle ) {
        missingFields.push('handle');
      }
      if( !vm.lot.packagingType ) {
        missingFields.push('packaging type');
      }
      if( !vm.lot.numBoxes && !validateShippingItems() ) {
        missingFields.push('shipping items');
      }
      if( missingFields.length ) {
        let msg = `Must input the following data before submission: ${missingFields}`;
        return ModalSvc.message( { header: 'Incomplete Lot', body: msg , type: 'error' } );
      }

      if ( !vm.lot.unmanifested && !vm.lot.manifestFileLocation && !vm.lot.hasInventory() ) { // marked as manifested but no manifest yet

        return ModalSvc.message( { header: 'No manifest', body: 'This lot has not yet been manifested.' } );

      }

      if( vm.lot.hasScannedManifest() && !vm.lot.statusIsAtLeast( 'Reviewed' ) ) {
        // return ModalSvc.message( { header: 'Manifest not reviewed', body: 'The lot manifest has not yet been reviewed.' } );
        const reviewNow = await ModalSvc.confirm( {
          header: 'Manifest not reviewed',
          body: 'The lot manifest has not yet been reviewed. Would you like to review it now?',
        } );
        return reviewNow && vm.reviewManifest();
      }

      return navigate.submitListing( vm.lot._id );
    }

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
        return vm.lot.save().then( _lot => {
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

    async function openRecentImageGallery() {

      const { images } = await ModalSvc.pastImagesGallery();

      if( images.length ) {

        await LotSvc.cloneImages( vm.lot._id, images );
        navigate.reload();

      }

    }

    function confirmAddLotImage( event ) {

      const imgUrl = event.target.currentSrc;

      const html = `
        <div class="confirm-add-lot-image-modal__container">
          <img class="confirm-add-lot-image-modal__image" src="${ imgUrl }"/>
        </div>
      `;

      ModalSvc.confirm({
        header: "Add Image",
        body: "Add this as a lot image?",
        html,
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

    function uploadManifestPage() {
      navigate.uploadLotManifest( vm.lot._id );
    }

  }]
);
