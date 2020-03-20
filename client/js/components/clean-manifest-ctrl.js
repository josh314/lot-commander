import angular from 'angular';

import * as xlsx from 'xlsx';

import * as libBarcodes from 'barcodes';

const __STANDARD_COLUMNS__ = [
  'UPC/EAN/GTIN',
  'Description',
  'Quantity',
  'Price'
];

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

  renameSheet(oldName, newName) {
    const sheet = this.sheets.find( s => s.name == oldName);
    if(sheet) {
      sheet.name = newName;
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

      ws['!cols'] = displaySheet.columns.filter( c => c.selected ).map( c => {
        return {
          width: displaySheet.getColumnWidth(c.name)
        };
      });
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

    if( this.rows && this.rows[0] ) {
      this.columns = Object.entries(this.rows[0]).filter( kv => kv[0] !== 'idx' ).map( kv => {
        return {
          name: kv[0],
          selectedColumnName: kv[0],
          selected: false,
          isBarcodeColumn: false,
          toggleSelect: function() {
            if(!this.isBarcodeColumn) {
              this.selected = !this.selected;
            }
          },
        };
      });
    }
    else {
      this.columns = [];
    }

    this.barcodeColumnName = null;
    
    this.updateColumnTitleOptions();
  }

  updateColumnTitleOptions() {
    const standardColumnAssignments = this.columns.reduce( (acc, column) => {
      if(column.selectedColumnName && column.selectedColumnName !== column.name) {
        acc[column.name] = column.selectedColumnName;
      }
      return acc;
    }, {});

    this.columns.forEach( currentColumn => {
      currentColumn.nameOptions = Object.assign( [ ], __STANDARD_COLUMNS__ ) ;

      for( let [columnName, selectedColumnName] of Object.entries(standardColumnAssignments) ) {
        if( columnName !== currentColumn.name ) {
          const foundIndex = currentColumn.nameOptions.findIndex( option => option === selectedColumnName );
          if( foundIndex >= 0 ) {
            currentColumn.nameOptions.splice( foundIndex, 1 );
          }
        }
      }

    });

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

  getBarcodeColumn() {
    return this.columns.find( c => c.isBarcodeColumn );
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
        try {
          r[barcodeColumn.name] = libBarcodes.addCheckDigit(r[barcodeColumn.name]);
        }
        catch(e) {
          console.log(e);
          console.log(r);
        }
      }
    }
  }

  getColumnWidth(columnName) {
    let columnWidth = Math.max( columnName.length + 3, 10);
    for( const r of this.rows ) {
      const data = r[columnName];
      try {
        columnWidth = Math.max( columnWidth, data.toString().length + 3 );
      }
      catch (e) {
        'no-op';
      }
    }
    return columnWidth;
  }

  filterRowColumns(row) {
    const out = {};

    const outputColumnNames = this.columns.filter( c => c.selected ).map( c => c.name );

    for( const [ columnName , value ] of Object.entries(row) ) {
      if( outputColumnNames.includes( columnName ) ) {
        const standardColumnMapping = this.standardColumnMappings.find( mapping => mapping.column === columnName );
        const outputColumnName = standardColumnMapping ? standardColumnMapping.standardColumn : columnName;
        out[outputColumnName] = value;
      }
    }

    return out;
  }


  // TODO: remove this bullshit
  upcColumnHack(row) {

    if( this.barcodeColumnName && row[this.barcodeColumnName] ) {
      row[this.barcodeColumnName] = `'${row[this.barcodeColumnName]}`;
    }

    return row;
  }

  getOutput() {
    const filter = this.filterRowColumns.bind(this);
    const hack = this.upcColumnHack.bind(this);
    return this.rows.map( filter ).map( hack );
  }
}

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', ['$scope', '$uibModal', 'sessionTimeout',
  function($scope, $uibModal, sessionTimeout) {
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

        const fileNameParts = vm.manifestFile.name.split('.');
        fileNameParts.pop();
        vm.outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');
  
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