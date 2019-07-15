import angular from 'angular';

import successBeepWav from '../../audio/success.wav';
import failBeepWav from '../../audio/fail.wav';

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller('ScanCtrl', ['$scope', '$http', '$interval', '$state', 'focus', 'lotStore', 'messageModal', 'saveManifest', 'sessionTimeout',
  function($scope, $http, $interval, $state, focus, lotStore, messageModal, saveManifest, sessionTimeout) {
    sessionTimeout.timeoutExpired();
    focus('barcodeInput');
    $scope.lot = lotStore;

    const save = () => {
      return saveManifest().then(resp=>{
        if(resp && resp.data && resp.data[0]) {
          lotStore.manifestId = resp.data[0]._id;
        }
      });
    };

    let autoSaveTimer;
    const autoSaveInterval = 30*1000;
    const autosaveFn = ()=>{
      console.log(`Auto-saving lot: ${lotStore.handle}`);
      return save().catch(e=>{
        $interval.cancel(autoSaveTimer);
        const m = `
          <p>An error has occured while scanning.</p>
          <details>
            <summary>Details</summary>
            <p>${e.message}</p>
          </details>
        `;
        console.log(m);
        messageModal.launch(
          {
            header: 'Error',
            html: m,
            type: 'error'
          },
          null,
          ()=>{ autoSaveTimer = $interval(autosaveFn, autoSaveInterval); }
        );
      });
    };
    autoSaveTimer = $interval(autosaveFn, autoSaveInterval);
      
    $scope.saveManifest = function() {
      console.log(`Auto-saving lot: ${lotStore.handle}`);
      $interval.cancel(autoSaveTimer);
      save().then(()=>{
        $state.go('main.lots.view', {lotId: lotStore._id});
      });
    };

    const successBeep = new Audio(successBeepWav);
    const failBeep = new Audio(failBeepWav);
    $scope.scanBarcode = function() {
      console.log($scope.lot);
      if ($scope.scanForm.barcode.$valid) {
        const item = lotStore.addInventory($scope.scannedBarcode);
        if(item) {
          if(item.quantity==1) {
            $http.get(`/api/product-data/${item.barcode}`).then(resp=>{
              if(resp && resp.data) {
                item.description = resp.data.title;
                item.price = resp.data.price;
                item.images = resp.data.images;
                if(item.description) {
                  successBeep.play();
                }
                else {
                  failBeep.play();
                }
              }
              else {
                failBeep.play();
              }
            });
          } else {
            successBeep.play();
          }
          $state.reload();
        }
      }
      else {
        failBeep.play();
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
      $interval.cancel(autoSaveTimer);
      save();
    });
  }
]);
