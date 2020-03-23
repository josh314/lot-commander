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
      const columnRenameMapping = {};

      this.columns = Object.entries(this.rows[0]).filter( kv => kv[0] !== 'idx' ).map( kv => {
        let [ name, _ ] = kv;

        // Rename column if it matches a standard column name
        const matchedStandardColumn = __STANDARD_COLUMNS__.find( column => column === name );
        if( matchedStandardColumn ) {
          const newName = '__' + matchedStandardColumn;
          columnRenameMapping[name] = newName;
          name = newName;
        }

        return {
          name: name,
          selectedColumnName: name,
          selected: false,
          isStandardColumn: function() {
            return this.selectedColumnName !== this.name;
          },
          isBarcodeColumn: function() {
            return this.selectedColumnName === __BARCODE_COLUMN__;
          },
          isSelected: function() {
            return this.selected || this.isStandardColumn();
          },
          toggleSelect: function() {
            if( !this.isStandardColumn() ) {
              this.selected = !this.selected;
            }
          },
        };
      });

      if( Object.keys(columnRenameMapping).length ) {
        this.rows.forEach( row => {
          for( let [ oldName, newName ] of Object.entries(columnRenameMapping) ) {
            row[newName] = row[oldName];
            delete row[oldName];
          }
        });
      }

    }
    else {
      this.columns = [];
    }

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

  setStandardColumn( columnName, standardColumnName ) {
    const column = this.columns.find( c => c.name === columnName );
    if( column ) {
      column.selectedColumnName = standardColumnName;
    }
  }

  getCellClass(row, column) {
    const _class = {};
    try {
      if( column.isSelected() ) {
        if( column.isBarcodeColumn() ) {
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
    } catch(e) {
      console.log(row);
      console.log(column);
    }
    return _class;
  }

  addCheckDigits() {
    const barcodeColumn = this.columns.find( c => c.isBarcodeColumn() );
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