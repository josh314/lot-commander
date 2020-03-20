import * as xlsx from 'xlsx';

import * as libBarcodes from 'barcodes';

const __STANDARD_COLUMNS__ = [
  'UPC/EAN/GTIN',
  'Description',
  'Quantity',
  'Price'
];

const __BARCODE_COLUMN__ = __STANDARD_COLUMNS__[0];

export class Sheet {
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
          // isBarcodeColumn: false,
          isStandardColumn: function() {
            return this.selectedColumnName !== this.name;
          },
          toggleSelect: function() {
            if( !this.isStandardColumn() ) {
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
    return this.columns.find( c => c.selectedColumnName === __BARCODE_COLUMN__ );
  }

  getCellClass(row, column) {
    const _class = {};
    try {
      if( column.isStandardColumn() ) {
        if( column.selectedColumnName === __BARCODE_COLUMN__ ) {
          const barcode = row[column.name];
          if(barcode) {
            if(libBarcodes.validateCheckDigit(barcode)) {
              _class.success = true;
            }
            else {
              _class.danger = true;
            }
          }
        }
        else {
          _class.warning = true;
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
    const barcodeColumn = this.columns.find( c => c.selectedColumnName === __BARCODE_COLUMN__ );
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

  // filterRowColumns(row) {
  //   const out = {};

  //   const outputColumns = this.columns.filter( c => c.selected || c.isStandardColumn() ).map( c => c.selectedColumnName );

  //   for( const [ columnName , value ] of Object.entries(row) ) {
  //     if( outputColumnNames.includes( columnName ) ) {
  //       const standardColumnMapping = this.standardColumnMappings.find( mapping => mapping.column === columnName );
  //       const outputColumnName = standardColumnMapping ? standardColumnMapping.standardColumn : columnName;
  //       out[outputColumnName] = value;
  //     }
  //   }

  //   return out;
  // }


  // TODO: remove this bullshit
  upcColumnHack(row) {

    if( this.barcodeColumnName && row[this.barcodeColumnName] ) {
      row[this.barcodeColumnName] = `'${row[this.barcodeColumnName]}`;
    }

    return row;
  }

  getOutput() {
    const filter = this.filterRowColumns.bind(this);
    // const hack = this.upcColumnHack.bind(this);
    return this.rows.map( filter )//.map( hack );
  }
}