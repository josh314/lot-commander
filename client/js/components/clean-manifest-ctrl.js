import angular from 'angular';

import * as xlsx from 'xlsx';


class DisplaySheet {
  constructor(sheetData) {
    const rows = xlsx.utils.sheet_to_json(sheetData[1]);

    this.name = sheetData[0];
    this.rows = rows.slice(0,50);
    this.columns = Object.entries(rows[0]).map( _ => {
      return {
        name: _[0],
        selected: false,
        toggleSelect: function() { this.selected = !this.selected; },
      };
    });
    this.barcodeColumn = null;
  }
}

/******************* Imports Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', ['$scope', 'sessionTimeout',
  function($scope, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.workbook = null;
    vm.manifest = null;
    vm.selectedSheet = null;
    vm.noFileSelected = false;

    // console.log('xlsx:');
    // console.log(xlsx);

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
          vm.workbook = wb;
          vm.manifest = Object.entries(wb.Sheets).map( sheetData => {
            return new DisplaySheet(sheetData);
          });
          vm.selectedSheet = vm.manifest[0].name;
          console.log(vm.manifest);
        });
      };
      reader.readAsArrayBuffer(vm.manifestFile);
    };

    vm.toggleSelect = function(column) {
      column.toggleSelect();
    };


  }
]);
