import * as xlsx from 'xlsx';

import * as libBarcodes from 'barcodes';

export class Sheet {
  constructor(opts) {

    this.manifest = opts.manifest;
    this.name = opts.name;
    this.__STANDARD_BARCODE_COLUMN__ = opts.standardBarcodeColumnName;
    this.__STANDARD_COLUMNS__ = opts.standardColumnNames;

    this.getBarcodeColumn = function() {
      return this.columns.find( column => column.isBarcodeColumn() );
    };

    const sheetParseOpts = {
      blankRows: true,
      defVal: '',
      range: opts.skipFirstRows || 0,
    };
    if(opts.noHeaderRow) {
      sheetParseOpts.header = "A";
    }

    this.rows = xlsx.utils.sheet_to_json(opts.data, sheetParseOpts).map( ( r, idx ) => {
      r.idx = idx;
      return r;
    });

    if( this.rows && this.rows[0] ) {
      const columnRenameMapping = {};
      const __BARCODE_COLUMN__ = this.__STANDARD_BARCODE_COLUMN__;

      this.columns = Object.entries(this.rows[0]).filter( kv => kv[0] !== 'idx' ).map( kv => {
        let [ name, _ ] = kv;

        // Rename column if it matches a standard column name
        const matchedStandardColumn = this.__STANDARD_COLUMNS__.find( column => column === name );
        if( matchedStandardColumn ) {
          const newName = '__' + matchedStandardColumn;
          columnRenameMapping[name] = newName;
          name = newName;
        }

        return {
          name: name,
          displayName: name,
          selected: false,
          isStandardColumn: function() {
            return this.displayName !== this.name;
          },
          isBarcodeColumn: function() {
            return this.displayName === __BARCODE_COLUMN__;
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
      if(column.displayName && column.displayName !== column.name) {
        acc[column.name] = column.displayName;
      }
      return acc;
    }, {});

    this.columns.forEach( currentColumn => {
      currentColumn.nameOptions = Object.assign( [ ], this.__STANDARD_COLUMNS__ ) ;

      for( let [columnName, displayName] of Object.entries(standardColumnAssignments) ) {
        if( columnName !== currentColumn.name ) {
          const foundIndex = currentColumn.nameOptions.findIndex( option => option === displayName );
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
      column.displayName = standardColumnName;
    }
  }

  getCellClass(row, column) {
    const _class = {};
    try {
      if( column.isSelected() ) {
        if( column.isBarcodeColumn() ) {

          if( row[column.name] ) {

            row[column.name] = `${ row[column.name] }`; // ensure the barcode is a string

            if(libBarcodes.validateCheckDigit( row[column.name] )) {
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
    }
    catch(e) {
      console.error(e);
      console.log(row);
      console.log(column);
    }
    return _class;
  }

  addCheckDigits() {
    const barcodeColumn = this.getBarcodeColumn();
    if(barcodeColumn) {
      for(const r of this.rows) {
        try {

          r[barcodeColumn.name] = `${ r[barcodeColumn.name] }`; // ensure the barcode is a string

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

  filterRowDataForOutput(row) {

    const columnNameMapping = this.columns.reduce( (mapping, column) => {
      mapping[ column.displayName ] = column.name;
      return mapping;
    }, {});

    const out = {};
    
    const outputColumnNames = this.columns.filter( c => c.isSelected() ).map( c => c.displayName );
    outputColumnNames.sort((a, b) => {
      const aIndex = this.__STANDARD_COLUMNS__.indexOf(a);
      const bIndex = this.__STANDARD_COLUMNS__.indexOf(b);
      if( aIndex < 0 && bIndex < 0 ) {
        return 0;
      }
      else if( aIndex < 0 ) {
        return 1;
      }
      else if( bIndex < 0 ) {
        return -1;
      }
      else {
        return aIndex - bIndex;
      }
    });

    for( let displayName of outputColumnNames ) {
      out[ displayName ] = row[ columnNameMapping[ displayName ] ];
    }

    return out;
  }

  // TODO: remove this bullshit
  upcColumnHack(row) {
    if( row[ this.__STANDARD_BARCODE_COLUMN__ ] ) {
      row[ this.__STANDARD_BARCODE_COLUMN__ ] = `'${row[ this.__STANDARD_BARCODE_COLUMN__ ]}`;
    }
    return row;
  }

  getOutput() {
    const filter = this.filterRowDataForOutput.bind(this);
    const hack = this.upcColumnHack.bind(this);
    return this.rows.map( filter ).map( hack );
  }
}