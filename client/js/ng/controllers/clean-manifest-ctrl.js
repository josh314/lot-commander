import angular from 'angular';
import * as xlsx from 'xlsx';

import { Sheet } from '../../sheet';
import { Manifest } from '../../manifest';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', ['$scope', '__STANDARD_MANIFEST_COLUMNS__', '__STANDARD_MANIFEST_BARCODE_COLUMN__', 'ManifestFileOptionsModal', 'sessionTimeout',
  function($scope, __STANDARD_MANIFEST_COLUMNS__, __STANDARD_MANIFEST_BARCODE_COLUMN__, ManifestFileOptionsModal, sessionTimeout) {
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

        $scope.$apply(function(){
          vm.manifest = new Manifest();
          for( const [name, data] of Object.entries(wb.Sheets) ) {
            const sheetOpts = {
              manifest: vm.manifest,
              name: name,
              data: data,
              noHeaderRow: vm.noHeaderRow,
              skipFirstRows: vm.skipFirstRows,
              standardColumnNames: __STANDARD_MANIFEST_COLUMNS__,
              standardBarcodeColumnName: __STANDARD_MANIFEST_BARCODE_COLUMN__,
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

    function createExcelOutput( filename, manifest ) {
      const wb = manifest.createExcelWorkbook();
      xlsx.writeFile(wb, filename);
    }

    vm.deleteSheet = function(sheet) {
      vm.manifest.deleteSheet(sheet);
    };

    vm.launchManifestFileOptionsModal = function() {

      const fileNameParts = vm.manifestFile.name.split('.');
      fileNameParts.pop();
      const outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');

      ManifestFileOptionsModal.launch(
        // modal data
        {
          filename: outputFilename,
          sheetNames: vm.manifest.sheets.map( s => ( { old: s.name, new: s.name } ) )
        },
        // callback upon modal closing
        ( manifestOptions ) => {
          if(!manifestOptions) {
            return;
          }
          for(const sheetName of manifestOptions.sheetNames) {
            if(sheetName.old!=sheetName.new) {
              vm.manifest.renameSheet(sheetName.old, sheetName.new);
            }
          }
          createExcelOutput( manifestOptions.filename , vm.manifest);
        }

      );

    };

    vm.splitActiveSheetByColumn = function( column ) {
      vm.manifest.splitActiveSheetByColumn( column );
    };
  }
]);