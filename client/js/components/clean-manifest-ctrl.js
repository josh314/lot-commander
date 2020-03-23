import angular from 'angular';
import * as xlsx from 'xlsx';

import { Sheet } from '../sheet';
import { Manifest } from '../manifest';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', ['$scope', '$uibModal', 'sessionTimeout',
  function($scope, $uibModal, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.manifest = null;
    vm.noFileSelected = false;
    vm.manifestFile = null;
    vm.noHeaderRow = false;
    vm.skipFirstRows = 0;

    vm.loadManifest = function() {
      if(!vm.manifestFile) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const wb = xlsx.read(data, {type: 'array'});
        console.log(wb);

        const fileNameParts = vm.manifestFile.name.split('.');
        fileNameParts.pop();
        vm.outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');
  
        $scope.$apply(function(){
          vm.manifest = new Manifest();
          for( const [name, data] of Object.entries(wb.Sheets) ) {
            const sheetOpts = {
              manifest: vm.manifest,
              name: name,
              data: data,
              noHeaderRow: vm.noHeaderRow,
              skipFirstRows: vm.skipFirstRows
            };
            vm.manifest.addSheet( new Sheet(sheetOpts) );
          }

        });
      };
      reader.readAsArrayBuffer(vm.manifestFile);
    };

    vm.toggleSelect = function(column) {
      column.toggleSelect();
    };

    vm.getActiveSheet = function() {
      return vm.manifest ? vm.manifest.getActiveSheet(): null;
    };

    vm.setActiveSheet = function(sheetName) {
      return vm.manifest ? vm.manifest.setActiveSheet(sheetName): null;
    };

    vm.addCheckDigitsAllSheets = function() {
      vm.manifest.addCheckDigitsAllSheets();
    };

    vm.createExcelOutput = function() {
      const wb = vm.manifest.createExcelWorkbook();
      xlsx.writeFile(wb, vm.outputFilename);
    };

    vm.deleteSheet = function(sheet) {
      vm.manifest.deleteSheet(sheet);
    };

    vm.launchManifestFileOptionsModal = function() {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_manifest_file_options_modal.html',
        size: 'lg',
        controller: 'ManifestFileOptionsModalController',
        backdrop: 'static',
        resolve: {
          options: function () {
            return {
              filename: vm.outputFilename,
              sheetNames: vm.manifest.sheets.map( s => ( { old: s.name, new: s.name } ) )
            };
          }
        },
      });

      modalInstance.result.then(function(manifestOptions) {
        if(!manifestOptions) {
          return;
        }
        console.log(manifestOptions);
        for(const sheetName of manifestOptions.sheetNames) {
          if(sheetName.old!=sheetName.new) {
            vm.manifest.renameSheet(sheetName.old, sheetName.new);
          }
        }
        // vm.outputFilename = manifestOptions.filename;
        vm.createExcelOutput();
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };
  }
]);

/***************** Modal Controllers ************************/
angular.module('myApp').controller('ManifestFileOptionsModalController', ['$scope', 'options', function($scope, options){
  $scope.manifestOptions = options;
}]);