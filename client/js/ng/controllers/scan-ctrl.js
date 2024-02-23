import angular from 'angular';

import * as util from '../../utilities';
const __MAX_DISPLAY_INVENTORY__ = 50;

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller( 'ScanCtrl', [

  'AudioAlertSvc',
  'focus',
  'ImageSvc',
  'LotSvc',
  'ModalSvc',
  'navigate',
  'ProductDataSvc',
  'sessionTimeout',

  function(

    AudioAlertSvc,
    focus,
    ImageSvc,
    LotSvc,
    ModalSvc,
    navigate,
    ProductDataSvc,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();
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
          decrementInventoryItem,
          incrementInventoryItem,
          saveManifest,
          saveManifestAndExit,
          editShippingItemsModal,
          validateInventory,

          util,

        }
      );

      LotSvc.load().then( _lot => {

        console.log('loaded lot', _lot);
        vm.lot = _lot;
        refreshDisplayInventory();

      });

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
      const inventory = vm.lot.inventory;
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
        loadThumbnailImage( item );
      }
    }

    function loadThumbnailImage( item ) {
      ImageSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
    }

    function validateInventory() {
      return vm.lot && vm.lot.validateInventory();
    }

    async function saveManifest() {

      if( validateInventory() ) {

        const manifest = await save();
        console.log('saveManifest result:', manifest);
        return { success: true, manifest };

      }
      else {

        ModalSvc.message( {
          header: 'Invalid data',
          html: `<p>The data for this manifest is invalid. Please correct these errors:</p> ${ vm.lot.composeInventoryErrorsHtmlMessage() }`,
          type: 'error',
        } );

        return { success: false };

      }

    }

    function saveManifestAndExit() {

      saveManifest().then( ( { success, manifest: _manifest } ) => {
        if( success ) {

          navigate.viewLot( vm.lot._id );

        }
      });

    }

    async function scanBarcode( scanForm ) {

      const scannedBarcode = scanForm.barcode.$viewValue;

      if ( scannedBarcode && scanForm.barcode.$valid ) {
        const item = vm.lot.addInventory( scannedBarcode );
        if(item) {

          AudioAlertSvc.success();

          if(item.quantity==1) {
            const product = await ProductDataSvc.getProductDataByBarcode( item.barcode );
            if(product) {
              item.description = product.title;
              item.price = product.price;
              item.images = product.images;
            }
          }
          vm.pagination.current = 1;
          refreshDisplayInventory();

        }
        else {
          AudioAlertSvc.fail();
        }
      }
      else {
        AudioAlertSvc.fail();
      }
      refreshScanInput();
    }

    function decrementInventoryItem( item ) {
      item.quantity = item.quantity>0 ? item.quantity - 1 : 0;
    }

    function incrementInventoryItem( item ) {
      item.quantity = item.quantity + 1;
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

  }
]);
