import angular from 'angular';

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

        }
      );

      LotSvc.load().then( _lot => {

        console.log('loaded lot', _lot);
        vm.lot = _lot;
        refreshDisplayInventory();

      });

    }

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

    function saveManifest() {
      return vm.lot.saveManifest().then( resp => {
        console.log('saveManifest resp', resp);
        refreshScanInput();
        return resp;
      } );
    }

    function saveManifestAndExit() {
      saveManifest().then(()=>{
        navigate.viewLot( vm.lot._id );
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

    function deleteInventoryItem( barcode ) {
      vm.lot.deleteProduct( barcode );
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
