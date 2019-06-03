import angular from 'angular';

/******************* Imports Controller *************************/
angular.module('myApp').controller('ImportsCtrl', ['$http', '$scope', '$state', 'fileUpload', 'messageModal', 'sessionTimeout',
  function($http, $scope, $state, fileUpload, messageModal, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    $scope.manifest = {
      parseOpts: {},
      noFileSelected: false,
      noBarcodeColSelected: false,
    };

    $scope.barcodeTextarea = '';

    $scope.waitingForResponse =false;

    $scope.importManifest = function() {
      if(!$scope.manifest.file) {
        $scope.manifest.noFileSelected = true;
        return;
      }
      else {
        $scope.manifest.noFileSelected = false;
      }

      if($scope.manifest.parseOpts.upcCol===undefined) {
        $scope.manifest.noBarcodeColSelected = true;
        return;
      }
      else {
        $scope.manifest.noBarcodeColSelected = false;
      }

      const manifest = $scope.manifest.file;
      const manifestFileExtension = manifest.name.split(".").pop();
      const validFileExtensions = ['xls', 'xlsx', 'xlsm']; // CSV?
      if(validFileExtensions.includes(manifestFileExtension)) {
        const uploadUrl = "/api/imports/manifest";
        const metadata = { 
          parseOpts: JSON.stringify($scope.manifest.parseOpts),
        };
        fileUpload.uploadFileToUrl(manifest, uploadUrl, metadata).then(resp=>{
          if(!resp.data.error) {
            messageModal.launch({header: 'Status', body: 'Submission successful.', type: 'success'});
          }
          else {
            messageModal.launch({header: 'Submission failed', body: resp.data.error, type: 'error'});
          }
          $state.reload();
        });
        $scope.waitingForResponse = true;
      }
      else {
        messageModal.launch({
          header: 'Input Error.',
          body: `Incorrect file type. Only these file extensions are accepted: ${validFileExtensions}`,
          type: 'error'
        });
      }

    };

    $scope.importResults = [];
    $scope.tooManyBarcodes = false;
    $scope.improperBarcode = false;
    $scope.importBarcodes = function(){
      const barcodes = [...new Set($scope.barcodeTextarea.split('\n').filter(barcode=>barcode))];
      $http.post(`/api/imports/barcodes`, {barcodes: barcodes}).then(function(resp){
        $scope.importResults = resp.data;
        $scope.barcodeTextarea = '';
      });
    };

    $scope.$watch('barcodeTextarea', function (newValue){
      const barcodes = [...new Set(newValue.split('\n').filter(barcode=>barcode))];
      // if(barcodes.length > 20) {
      //  $scope.tooManyBarcodes = true;
      //  return;
      // }
      // else {
      //  $scope.tooManyBarcodes = false;
      // }
      $scope.improperBarcode = false;
      for (let i=0; i<barcodes.length; i++) {
        if(!barcodes[i].match(/^[0-9]{8,15}$/)) {
          $scope.improperBarcode = true;
          break;
        }
      }
    });
  }
]);
