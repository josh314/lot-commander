import angular from 'angular';

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
    vm.editShippingItems = editShippingItems;
    vm.scanBarcode = scanBarcode;

    vm.numLotBoxes = lotStore.numBoxes;
    vm.loadedImages = {};

    const save = () => {
      return LotSvc.saveManifest().then( manifest => {

        if( manifest ) {
          lotStore.manifestId = manifest._id;
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

    function editShippingItems() {
      return ModalSvc.shippingItems()
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
