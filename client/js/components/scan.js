import angular from 'angular';

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller('ScanCtrl', [ '$http', 'AudioAlertSvc', 'focus', 'ImageSvc', 'lotStore', 'LotSvc', 'navigate', 'sessionTimeout', 'shippingItemsModal',
  function( $http, AudioAlertSvc, focus, ImageSvc, lotStore, LotSvc, navigate, sessionTimeout, shippingItemsModal ) {
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
    vm.editShippingItems = editShippingItems;
    vm.scanBarcode = scanBarcode;

    vm.numLotBoxes = lotStore.numBoxes; 
    vm.loadedImages = {};

    const save = () => {
      return LotSvc.saveManifest().then( resp => {

        if( resp && resp[0] ) {
          lotStore.manifestId = resp[0]._id;
        }

      });
    };

    const initializeAllThumbnailImages = () => {
      for(let i=0; i<lotStore.inventory.length; i++) {
        const item = lotStore.inventory[i];
        ImageSvc.loadRepresentativeImage( { images: item.images, className: "inventory-preview-img" } ).then(img => vm.loadedImages[item.barcode] = img);
      }
    };
    initializeAllThumbnailImages();

    function saveManifest() {
      console.log(`Auto-saving lot: ${lotStore.handle}`);
      save().then(()=>{
        navigate.viewLot( lotStore._id );
      });
    }

    async function scanBarcode( scanForm ) {

      const scannedBarcode = scanForm.barcode.$viewValue;

      if ( scannedBarcode && scanForm.barcode.$valid ) {
        const item = lotStore.addInventory( scannedBarcode );
        if(item) {
          if(item.quantity==1) {
            const resp = await $http.get(`/api/product-data/${item.barcode}`);
            if(resp && resp.data) {
              item.description = resp.data.title;
              item.price = resp.data.price;
              item.images = resp.data.images;
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

    function editShippingItems() {
      return shippingItemsModal
        .launch()
        .then(shippingItems => {
          if(shippingItems) {
            lotStore.shippingItems = shippingItems;
            return LotSvc.edit( lotStore._id, lotStore ).then( _resp => {
              return true;
            });
          }
          else {
            return false;
          }
        });
    }

  }
]);
