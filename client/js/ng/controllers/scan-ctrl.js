import angular from 'angular';

import * as util from '../../utilities';
import * as audioAlerts from '../../audio-alerts';
const __MAX_DISPLAY_INVENTORY__ = 50;

const __INVENTORY_VALIDATION_OPTIONS__ = {
  allowMissingTitle: true,
  allowMissingPrice: true,
  allowMissingImages: true,
};

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller( 'ScanCtrl', [

  'focus',
  'LotSvc',
  'MediaSvc',
  'ModalSvc',
  'navigate',
  'ProductDataSvc',

  function(

    focus,
    LotSvc,
    MediaSvc,
    ModalSvc,
    navigate,
    ProductDataSvc,

  ) {

    const vm = this;
    init();

    function init() {

      refreshScanInput();

      Object.assign(
        vm,
        {

          loadedImages: {},
          maxDisplayInventory: __MAX_DISPLAY_INVENTORY__,
          pagination: {
            current: 1,
            totalItems: 0,
            pageSize: __MAX_DISPLAY_INVENTORY__,
            pageChange: function() {
              refreshDisplayInventory();
              refreshScanInput();
            },
            maxSize: 8
          },

          scanBarcode,
          deleteInventoryItem,
          saveManifestAndContinue,
          saveManifestAndExit,
          exitWithoutSaving,
          finishScanning,
          canFinishScanning,
          editShippingItemsModal,
          validateInventory,
          isManifestChanged,
          editProductData,

          // media files
          showMedia: false,
          toggleShowMedia,
          uploadImageCb,
          uploadVideoCb,

          util,

        }
      );

      LotSvc.load( { pollProcessingMedia: true } ).then( _lot => {

        console.log('loaded lot', _lot);
        vm.lot = _lot;
        vm.lastSavedInventory = vm.lot.serializedInventory();
        refreshDisplayInventory();

      });

    }


    function isManifestChanged() {

      if( vm.lot && vm.lot.hasInventory() ) {

        return vm.lot.serializedInventory() !== vm.lastSavedInventory;

      }

    }

    function editProductData( item ) {
      item.setAsDirty();
    }

    const save = () => {
      return vm.lot.saveManifest().then( manifest => {

        if( manifest ) {
          vm.lot.manifestId = manifest._id;
        }

        return manifest;
      });
    };

    function refreshScanInput() {
      vm.scannedBarcode = '';
      focus('barcodeInput');
    }

    function refreshDisplayInventory() {
      const inventory = vm.lot.getInventory();
      vm.pagination.totalItems = inventory.length;
      const start = ( vm.pagination.current - 1 ) * __MAX_DISPLAY_INVENTORY__;
      const end = start + __MAX_DISPLAY_INVENTORY__;
      vm.displayInventory = inventory.slice( start, end );
      loadInventoryThumbnailImages();
    }

    function loadInventoryThumbnailImages() {

      const limit = Math.min( vm.displayInventory.length, __MAX_DISPLAY_INVENTORY__ );

      for(let i=0; i < limit; i++) {
        const item = vm.displayInventory[i];
        if( !item.waiting ) {
          loadThumbnailImage( item );
        }
      }
    }

    function loadThumbnailImage( item ) {
      return MediaSvc.loadRepresentativeImage({images: item.data.images, containerId: `item-thumbnail-container-${item.data.barcode}`, className: "inventory-preview-img"});
    }

    function validateInventory() {
      return vm.lot && vm.lot.validateInventory( __INVENTORY_VALIDATION_OPTIONS__ );
    }

    async function saveManifest() {

      if( !validateInventory( __INVENTORY_VALIDATION_OPTIONS__ )) {

        const isConfirmed = await ModalSvc.confirm( {
          header: 'Invalid data',
          html: `<p>The data for this manifest is invalid with these errors:</p> ${ vm.lot.composeInventoryErrorsHtmlMessage() }`,
          type: 'error',
          trueText: 'Save anyway',
          falseText: 'Cancel'
        } );

        if( !isConfirmed ) {
          return { success: false };
        }

      }

      const manifest = await ModalSvc.wait({
        waitFor: save(),
        message: 'Saving manifest...',
      });
      vm.lastSavedInventory = vm.lot.serializedInventory();
      console.log('saveManifest result:', manifest);

      await ModalSvc.message( {
        header: 'Success',
        html: '<p>The manifest has been saved.</p>',
        buttonText: 'Continue',
      });
      return { success: true, manifest };

    }

    function saveManifestAndContinue() {

      if( !vm.isManifestChanged() ) {
        return { success: false };
      }

      return saveManifest();


    }

    function exitWithoutSaving() {

      navigate.viewLot( vm.lot._id );

    }

    function saveManifestAndExit() {

      saveManifest().then( ( { success, manifest: _manifest } ) => {
        if( success ) {

          navigate.viewLot( vm.lot._id );

        }
      });

    }

    function canFinishScanning() {
      return vm.lot && vm.lot.status === 'In Preparation' && !vm.lot.pallet && !vm.lot.unmanifested;
    }

    async function finishScanning() {

      if( !validateInventory( __INVENTORY_VALIDATION_OPTIONS__ )) {

        const isConfirmed = await ModalSvc.confirm( {
          header: 'Invalid data',
          html: `<p>The data for this manifest is invalid with these errors:</p> ${ vm.lot.composeInventoryErrorsHtmlMessage() }`,
          type: 'error',
          trueText: 'Finish anyway',
          falseText: 'Cancel'
        } );

        if( !isConfirmed ) {
          return;
        }

      }
      else {

        const isConfirmed = await ModalSvc.confirm( {
          header: 'Finish Scanning',
          body: 'This will lock the Lot manifest and start data backfill for any missing product data. Continue?',
        } );

        if( !isConfirmed ) {
          return;
        }

      }

      const lot = await ModalSvc.wait({
        waitFor: vm.lot.finishScanning(),
        message: 'Locking Lot and starting data backfill...',
      });

      vm.lot.status = lot.status;

      navigate.viewLot( vm.lot._id );

    }

    function validateBarcode( barcode ) {

      if( barcode.length < 7 || barcode.length > 14 ) {
        return false;
      }

      return true;
    }

    async function scanBarcode( ) {

      if( vm.lot.status === 'Pending Data' ) {

        await ModalSvc.message( {
          header: 'Backfill in progress',
          html: '<p>This Lot is locked while AI backfill fills in missing product data. Scanning is disabled until backfill completes.</p>',
          buttonText: 'OK',
        });

        return;

      }

      const scannedBarcode = vm.scannedBarcode;

      const valid = validateBarcode( scannedBarcode );
      vm.scannedBarcodeInvalid = !valid;

      if ( scannedBarcode && valid ) {
        const item = vm.lot.addInventory( scannedBarcode );
        if(item) {

          audioAlerts.success();

          if(item.data.quantity==1) {

            item.waiting = true;
            console.log('waiting for product data for barcode:', item.data.barcode);

            ProductDataSvc.getProductDataByBarcode( item.data.barcode, { lotId: vm.lot._id } ).then( product => {
              console.log('product data:', product);
              delete item.waiting;
              if(product) {
                Object.assign( item.data, product );
              }
              console.log('item:', item);

              return item;
            }).then( loadThumbnailImage );

          }
          vm.pagination.current = 1;
          refreshDisplayInventory();

        }
        else {
          audioAlerts.fail();
        }
      }
      else {
        audioAlerts.fail();
      }
      refreshScanInput();
    }

    function deleteInventoryItem( item ) {
      vm.lot.deleteInventoryItem( item );
      refreshDisplayInventory();
      refreshScanInput();
    }

    function editShippingItemsModal() {
      return ModalSvc.shippingItems( vm.lot.shippingItems )
        .then( editShippingItemsCb )
        .then( refreshScanInput );
    }


    async function editShippingItemsCb( shippingItems ) {
      if(shippingItems) {
        return vm.lot.saveShippingItems( shippingItems ).then( _resp => {
          return true;
        });
      }
      else {
        return false;
      }
    }

    function toggleShowMedia() {
      vm.showMedia = !vm.showMedia;
    }

    function uploadImageCb( image ) {
      return vm.lot.uploadMedia( image, 'images' );
    }

    function uploadVideoCb( video ) {
      return vm.lot.uploadMedia( video, 'videos' );
    }

  }
]);
