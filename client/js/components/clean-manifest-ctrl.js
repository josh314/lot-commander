import angular from 'angular';

import * as xlsx from 'xlsx';

import * as libBarcodes from 'barcodes';

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

  addCheckDigits() {
    for( const s of this.sheets ) {
      s.addCheckDigits();
    }
  }



  createExcelWorkbook() {
    const wb = xlsx.utils.book_new();
    for( const displaySheet of this.sheets ) {
      const ws = xlsx.utils.json_to_sheet(
        displaySheet.getOutput(),
        {}
      );
      xlsx.utils.book_append_sheet(wb, ws, displaySheet.name);
    }
    return wb;
  }

  deleteSheet(sheet) {
    const idx = this.sheets.findIndex( s => s == sheet );
    if(idx >= 0) {
      this.sheets.splice(idx, 1);
      this.activeSheet = this.sheets[0];
    }
  }
}

class DisplaySheet {
  constructor(opts) {

    this.manifest = opts.manifest;
    this.name = opts.name;

    const sheetParseOpts = {
      blankRows: true,
      defVal: '',
    };
    if(opts.noHeaderRow) {
      sheetParseOpts.header = "A";
    }

    this.rows = xlsx.utils.sheet_to_json(opts.rows, sheetParseOpts).map( ( r, idx ) => {
      r.idx = idx;
      return r;
    });

    this.columns = Object.entries(this.rows[0]).filter( kv => kv[0] !== 'idx' ).map( kv => {
      return {
        name: kv[0],
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

    const currentBarcodeColumn = this.columns.find( c => c.isBarcodeColumn );
    if(currentBarcodeColumn) {
      currentBarcodeColumn.isBarcodeColumn = false;
      currentBarcodeColumn.selected = false;
    }

    const newBarcodeColumn = this.columns.find( c => c.name == this.barcodeColumnName );
    if(newBarcodeColumn) {
      newBarcodeColumn.isBarcodeColumn = true;
      newBarcodeColumn.selected = true;
      for( const r of this.rows ) {
        const barcode = r[newBarcodeColumn.name];
        if( typeof barcode == 'number' ) {
          r[newBarcodeColumn.name] = barcode.toString();
        }
      }
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

  getCellClass(row, column) {
    const _class = {};
    try {
      if(column.isBarcodeColumn) {
        const barcode = row[this.barcodeColumnName];
        if(barcode) {
          if(libBarcodes.validateCheckDigit(barcode)) {
            _class.success = true;
          }
          else {
            _class.danger = true;
          }
        }
      }
      else if (column.selected) {
        _class.warning = true;
      }
    } catch(e) {
      console.log(row);
      console.log(column);
    }
    return _class;
  }

  addCheckDigits() {
    const barcodeColumn = this.columns.find( c => c.isBarcodeColumn );
    if(barcodeColumn) {
      for(const r of this.rows) {
        r[barcodeColumn.name] = libBarcodes.addCheckDigit(r[barcodeColumn.name]);
      }
    }
  }

  filterRowColumns(row) {
    const out = {};

    const outputColumnNames = this.columns.filter( c => c.selected ).map( c => c.name );

    for( const [ columnName , value ] of Object.entries(row) ) {
      if( outputColumnNames.includes( columnName ) ) {
        out[columnName] = value;
      }
    }

    return out;
  }

  getOutput() {
    const filter = this.filterRowColumns.bind(this)
    return this.rows.map( filter );
  }
}

/******************* Imports Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', ['$scope', 'sessionTimeout',
  function($scope, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.manifest = null;
    vm.noFileSelected = false;
    vm.manifestFile = null;
    vm.noHeaderRow = false;

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
          for( const [name, rows] of Object.entries(wb.Sheets) ) {
            const sheetOpts = {
              manifest: vm.manifest,
              name: name,
              rows: rows,
              noHeaderRow: vm.noHeaderRow
            };
            vm.manifest.addSheet( new DisplaySheet(sheetOpts) );
          }

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

    vm.addCheckDigits = function() {
      vm.manifest.addCheckDigits();
    };

    vm.createExcelOutput = function() {
      const wb = vm.manifest.createExcelWorkbook();
 
      const fileNameParts = vm.manifestFile.name.split('.');
      fileNameParts.pop();
      
      let filename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');

      xlsx.writeFile(wb, filename);
    };

    vm.deleteSheet = function(sheet) {
      vm.manifest.deleteSheet(sheet);
    };
  }
]);
