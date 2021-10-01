import angular from 'angular';

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller('ScanCtrl', ['$scope', '$http', '$interval', '$state', 'AudioAlertSvc', 'focus', 'ImageSvc', 'lotStore', 'LotSvc', 'messageModal', 'saveManifest', 'sessionTimeout', 'shippingItemsModal',
  function( $scope, $http, $interval, $state, AudioAlertSvc, focus, ImageSvc, lotStore, LotSvc, messageModal, saveManifest, sessionTimeout, shippingItemsModal ) {
    sessionTimeout.timeoutExpired();
    focus('barcodeInput');
    $scope.lot = lotStore;

    $scope.loadedImages = {};

    const save = () => {
      return saveManifest().then(resp=>{
        if(resp && resp.data && resp.data[0]) {
          lotStore.manifestId = resp.data[0]._id;
        }
      });
    };

    // let autoSaveTimer;
    // const autoSaveInterval = 30*1000;
    // const autosaveFn = ()=>{
    //   console.log(`Auto-saving lot: ${lotStore.handle}`);
    //   return save().catch(e=>{
    //     $interval.cancel(autoSaveTimer);
    //     const m = `
    //       <p>An error has occured while scanning.</p>
    //       <details>
    //         <summary>Details</summary>
    //         <p>${e.message}</p>
    //       </details>
    //     `;
    //     console.log(m);
    //     messageModal.launch(
    //       {
    //         header: 'Error',
    //         html: m,
    //         type: 'error'
    //       },
    //       null,
    //       ()=>{ autoSaveTimer = $interval(autosaveFn, autoSaveInterval); }
    //     );
    //   });
    // };
    // autoSaveTimer = $interval(autosaveFn, autoSaveInterval);
      
    const initializeAllThumbnailImages = () => {
      for(let i=0; i<lotStore.inventory.length; i++) {
        const item = lotStore.inventory[i];
        ImageSvc.loadRepresentativeImage( { images: item.images, className: "inventory-preview-img" } ).then(img => $scope.loadedImages[item.barcode] = img);
      }
    };
    initializeAllThumbnailImages();

    $scope.saveManifest = function() {
      console.log(`Auto-saving lot: ${lotStore.handle}`);
      // $interval.cancel(autoSaveTimer);
      save().then(()=>{
        $state.go('main.lots.view', {lotId: lotStore._id});
      });
    };

    $scope.scanBarcode = async function() {
      console.log($scope.lot);
      if ($scope.scannedBarcode && $scope.scanForm.barcode.$valid) {
        const item = lotStore.addInventory($scope.scannedBarcode);
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
          $state.reload();
        }
        else {
          AudioAlertSvc.fail();
        }
      }
      else {
        AudioAlertSvc.fail();
      }
    };

    $scope.decrementInventory = function(barcode) {
      lotStore.decrementInventory(barcode);
      // focus('barcodeInput');
      save().then(()=> $state.reload());
    };

    $scope.deleteProduct = function(barcode) {
      lotStore.deleteProduct(barcode);
      save().then(()=> $state.reload());
    };

    $scope.$on('$stateChangeStart', () => {
      console.log(`Auto-saving lot: ${lotStore.handle}`);
      // $interval.cancel(autoSaveTimer);
      save();
    });

    const editShippingItems = function() {
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
    };
    $scope.editShippingItems = editShippingItems;
  }
]);
