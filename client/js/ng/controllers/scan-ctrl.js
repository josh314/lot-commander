import angular from 'angular';

const __MAX_DISPLAY_INVENTORY__ = 50;

const __PRICE_REGEX__ = /^\d+(\.\d{1,2})?$/;

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller( 'ScanCtrl', [

  'AudioAlertSvc',
  'focus',
  'ImageSvc',
  'lotStore',
  'LotSvc',
  'ModalSvc',
  'navigate',
  'ProductDataSvc',
  'sessionTimeout',

  function(

    AudioAlertSvc,
    focus,
    ImageSvc,
    lotStore,
    LotSvc,
    ModalSvc,
    navigate,
    ProductDataSvc,
    sessionTimeout,

  ) {

    sessionTimeout.timeoutExpired();
    focus('barcodeInput');

    const vm = this;

    vm.getLotHandle = lotStore.getHandle.bind( lotStore );
    vm.getLotNumSku = lotStore.getNumSku.bind( lotStore );
    vm.getLotInventoryTotal = lotStore.getInventoryTotal.bind( lotStore );
    vm.getLotInventory = lotStore.getInventory.bind( lotStore );
    vm.deleteInventoryItem = deleteInventoryItem;
    vm.decrementInventory = decrementInventory;
    vm.saveManifest = saveManifest;
    vm.saveManifestAndExit = saveManifestAndExit;
    vm.openEditShippingItemsModal = openEditShippingItemsModal;
    vm.scanBarcode = scanBarcode;

    vm.numLotBoxes = lotStore.numBoxes;
    vm.loadedImages = {};

    vm.maxDisplayInventory = __MAX_DISPLAY_INVENTORY__;

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __MAX_DISPLAY_INVENTORY__,
      pageChange: refreshDisplayInventory,
      maxSize: 8
    };

    vm.priceRegex = __PRICE_REGEX__;

    const save = () => {
      return LotSvc.saveManifest().then( manifest => {

        if( manifest ) {
          lotStore.manifestId = manifest._id;
        }

        return manifest;
      });
    };

    function refreshDisplayInventory() {
      const inventory = vm.getLotInventory();
      vm.pagination.totalItems = inventory.length;
      const start = ( vm.pagination.current - 1 ) * __MAX_DISPLAY_INVENTORY__;
      const end = start + __MAX_DISPLAY_INVENTORY__;
      vm.displayInventory = inventory.slice( start, end );
      initializeAllThumbnailImages();
    }

    function initializeAllThumbnailImages() {

      const limit = Math.min( vm.displayInventory.length, __MAX_DISPLAY_INVENTORY__ );

      for(let i=0; i < limit; i++) {
        const item = vm.displayInventory[i];
        ImageSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
      }
    }


    function validateInventoryItem( item ) {

      if( !item.barcode ) {
        return false;
      }

      if( ! __PRICE_REGEX__.test( item.price ) ) {console.log('price regex fail', item.price)
        return false;
      }

      return true;

    }

    function validateInventory() {

      const inventory = vm.getLotInventory();

      for(let i=0; i < inventory.length; i++) {
        const item = inventory[i];
        if( !validateInventoryItem( item ) ) {
          ModalSvc.message( {
            header: 'Invalid data',
            body: `The data for item with barcode ${item.barcode} is invalid. Please correct it and try again.`,
            type: 'error',
          } );
          return false;
        }
      }

      return true;
    }


    async function saveManifest() {

      if( validateInventory() ) {

        const manifest = await save();
        console.log('saveManifest result:', manifest);
        return { success: true, manifest };

      }
      else {
        return { success: false };
      }

    }

    function saveManifestAndExit() {
      saveManifest().then( ( { success, manifest: _manifest } ) => {
        if( success ) {

          navigate.viewLot( lotStore._id );

        }
      });
    }

    async function scanBarcode( scanForm ) {

      const scannedBarcode = scanForm.barcode.$viewValue;

      if ( scannedBarcode && scanForm.barcode.$valid ) {
        const item = lotStore.addInventory( scannedBarcode );
        if(item) {
          if(item.quantity==1) {
            const product = await ProductDataSvc.getProductDataByBarcode( item.barcode );
            if(product) {
              item.description = product.title;
              item.price = product.price;
              item.images = product.images;
            }
          }
          AudioAlertSvc.success();
          navigate.reload();
        }
        else {
          AudioAlertSvc.fail();
        }
      }
      else {
        AudioAlertSvc.fail();
      }
    }

    function decrementInventory( barcode ) {
      lotStore.decrementInventory(barcode);
      // focus('barcodeInput');
      save().then(()=> navigate.reload());
    }

    function deleteInventoryItem( barcode ) {
      lotStore.deleteProduct(barcode);
      save().then(()=> navigate.reload());
    }

    function openEditShippingItemsModal() {
      return ModalSvc.shippingItems( lotStore.shippingItems )
        .then( editShippingItemsCb );
    }


    function editShippingItemsCb( shippingItems ) {
      if(shippingItems) {
        lotStore.shippingItems = shippingItems;
        return LotSvc.edit( lotStore._id, lotStore ).then( _resp => {
          return true;
        });
      }
      else {
        return false;
      }
    }

    refreshDisplayInventory();

  }
]);
