import angular from 'angular';

import * as util from '../../utilities';
const __MAX_DISPLAY_INVENTORY__ = 50;


function cmpManifestItems( a, b ) {

  if( a.barcode && b.barcode && a.barcode !== b.barcode ) {
    return a.barcode < b.barcode ? -1 : +1;
  }
  else if ( a.description && b.description && a.description !== b.description ) {
    return a.description < b.description ? -1: +1;
  }
  else if ( a.brand && b.brand && a.brand !== b.brand ) {
    return a.brand < b.brand ? -1: +1;
  }
  else if ( a.price && b.price && a.price !== b.price ) {
    return a.price < b.price ? -1: +1;
  }
  else if ( a.quantity && b.quantity && a.quantity !== b.quantity ) {
    return a.quantity < b.quantity ? -1 : +1;
  }
  else {
    return 0;
  }

}

function serializeManifest( manifest ) {

  const sortedManifest = [ ...manifest ].map( item => {

    const _item = { ...item };

    if( _item.price ) {
      _item.price = parseFloat( _item.price );
    }

    if( _item.errors ){
      delete _item.errors;
    }
    /* eslint-disable angular/no-private-call */
    if( _item.$$hashKey ) {
      delete _item.$$hashKey;
    }
    /* eslint-enable angular/no-private-call */

    return _item;

  } ).sort( cmpManifestItems );

  return JSON.stringify( sortedManifest );

}

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
          saveManifestAndContinue,
          saveManifestAndExit,
          editShippingItemsModal,
          validateInventory,
          isManifestChanged,

          util,

        }
      );

      LotSvc.load().then( _lot => {

        console.log('loaded lot', _lot);
        vm.lot = _lot;
        vm.lastSavedManifest = serializeManifest( vm.lot.inventory );
        refreshDisplayInventory();

      });

    }


    function isManifestChanged() {

      if( vm.lot && vm.lot.inventory ) {

        return serializeManifest( vm.lot.inventory ) !== vm.lastSavedManifest;

      }

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

        const manifest = await ModalSvc.wait({
          waitFor: save(),
          message: 'Saving manifest...',
        });

        refreshDisplayInventory();

        vm.lastSavedManifest = serializeManifest( vm.lot.inventory );
        console.log('saveManifest result:', manifest);

        await ModalSvc.message( {
          header: 'Success',
          html: '<p>The manifest has been saved.</p>',
          buttonText: 'Continue',
        });
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

    function saveManifestAndContinue() {

      if( !vm.isManifestChanged() ) {
        return { success: false };
      }

      return saveManifest();


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
              item.brand = product.brand;
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
