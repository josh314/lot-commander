import angular from 'angular';

import * as xlsx from 'xlsx';

class Manifest {
  constructor() {
    this.sheets = [];
    this.activeSheet = null;
    this.barcodeColumnAllSheets = false;
  }
  addSheet(sheet) {
    this.sheets.push(sheet);
    if(this.sheets.length===1) {
      this.activeSheet = this.sheets[0];
    }
  }

  setBarcodeColumnAllSheets(barcodeColumnName) {
    for( const s of this.sheets ) {
      s.barcodeColumnName = barcodeColumnName;
      s.setSheetBarcodeColumn();
    }
  }

  setActiveSheet(sheetName) {
    this.activeSheet = this.sheets.find( s => s.name == sheetName );
  }

  getActiveSheet() {
    return this.activeSheet;
  }
}

class DisplaySheet {
  constructor(opts) {

    this.manifest = opts.manifest;
    this.name = opts.name;

    const rows = xlsx.utils.sheet_to_json(opts.rows);
    this.rows = rows.slice(0,50);

    this.columns = Object.entries(rows[0]).map( _ => {
      return {
        name: _[0],
        selected: false,
        isBarcodeColumn: false,
        toggleSelect: function() {
          if(!this.isBarcodeColumn) {
            this.selected = !this.selected;
          }
        },
      };
    });

    this.barcodeColumnName = null;

  }

  setSheetBarcodeColumn() {

    const currentColumn = this.columns.find( c => c.isBarcodeColumn );
    if(currentColumn) {
      currentColumn.isBarcodeColumn = false;
      currentColumn.selected = false;
    }

    const newBarcodeColumn = this.columns.find( c => c.name == this.barcodeColumnName );
    if(newBarcodeColumn) {
      newBarcodeColumn.isBarcodeColumn = true;
      newBarcodeColumn.selected = true;
    }

  }

  setBarcodeColumn() {
    if( this.manifest.barcodeColumnAllSheets ) {
      this.manifest.setBarcodeColumnAllSheets(this.barcodeColumnName);
    }
    else {
      this.setSheetBarcodeColumn();
    }
  }
}

/******************* Imports Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', ['$scope', 'sessionTimeout',
  function($scope, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.manifest = null;
    vm.noFileSelected = false;

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
          // vm.workbook = wb;
          vm.manifest = new Manifest();
          for( const [name, rows] of Object.entries(wb.Sheets) ) {
            const sheetOpts = {
              manifest: vm.manifest,
              name: name,
              rows: rows
            };
            vm.manifest.addSheet( new DisplaySheet(sheetOpts) );
          }
          
          console.log(vm.manifest);
        });
      };
      reader.readAsArrayBuffer(vm.manifestFile);
    };

    vm.toggleSelect = function(column) {
      column.toggleSelect();
    };

    vm.setBarcodeColumnAllSheets = function() {
      if(vm.manifest.barcodeColumnAllSheets) {
        const activeSheet = vm.getActiveSheet();
        activeSheet.setBarcodeColumn();
      }
    };

    vm.getActiveSheet = function() {
      return vm.manifest ? vm.manifest.getActiveSheet(): null;
    };

    vm.setActiveSheet = function(sheetName) {
      return vm.manifest ? vm.manifest.setActiveSheet(sheetName): null;
    };
  }
]);
