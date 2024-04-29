import * as xlsx from 'xlsx-js-style';
import { Column, Sheet } from './sheet';
import {
  __STANDARD_MANIFEST_PALLET_ID_COLUMN__,
  __STANDARD_MANIFEST_BARCODE_COLUMN__,
  __STANDARD_MANIFEST_QUANTITY_COLUMN__,
  __STANDARD_MANIFEST_DESCRIPTION_COLUMN__,
  __STANDARD_MANIFEST_CATEGORY_COLUMN__,
  __STANDARD_MANIFEST_BRAND_COLUMN__,
  __STANDARD_MANIFEST_UNIT_COST_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_COST_COLUMN__,
  __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_COLUMNS__,
  __STANDARD_MANIFEST_DISPLAY_COLUMNS__,
} from './manifest-constants';

export class Manifest {
  constructor( sheets ) {
    this.clearSheets();
    this.addSheets( sheets );
  }

  clearSheets() {
    this.sheets = [];
    this.activeSheet = null;
  }

  addSheet(sheet) {
    this.sheets.push( sheet );
    sheet.setManifest( this );
    if(this.sheets.length===1) {
      this.activeSheet = this.sheets[0];
    }
  }

  addSheets( sheets ) {
    if( Array.isArray( sheets ) ) {
      for( const s of sheets ) {
        this.addSheet( s );
      }
    }
  }

  removeRow( sheet, idx ) {
    sheet.removeRow( idx );
  }

  mergeManifests( manifest ) {
    manifest.sheets.forEach( s => this.addSheet( s ) );
    return this;
  }

  mergeAllSheets( { mergedSheetName = 'Data', sheetColumnName = 'Sheet', sheetnameTransformMap } = {}) {

    const newSheetColumnsMap = new Map();
    const sheetColumn = new Column( {
      name: 'Sheet',
      displayName: sheetColumnName,
    } );
    newSheetColumnsMap.set( sheetColumn.displayName, sheetColumn );

    // dedup columns of all sheets
    for( let _sheet of this.sheets ) {

      for( let _column of _sheet.columns ) {

        const existingColumn = newSheetColumnsMap.get( _column.displayName );
        if( !existingColumn ) {
          newSheetColumnsMap.set( _column.displayName, _column );
        }

      }

    }
    const newSheetColumns = [ ... newSheetColumnsMap.values() ];

    const newSheetRows = [];
    for( let _sheet of this.sheets ) {

      for( let _row of _sheet.rows ) {

        newSheetRows.push( Object.assign( { [sheetColumn.name]: _sheet.name }, _row ) );

      }

    }

    if( sheetnameTransformMap ) {

      newSheetRows.forEach( r => {

        if( sheetnameTransformMap.get( r[ 'Sheet' ] ) ) {
          r[ 'Sheet' ] = sheetnameTransformMap.get( r[ 'Sheet' ] );
        }

      });

    }

    // create new Sheet with combined data
    const newSheet = new Sheet( {
      name: mergedSheetName,
      manifest: this,
      rows: newSheetRows,
      columns: newSheetColumns
    } );

    this.clearSheets();
    this.addSheet( newSheet );
    if( sheetColumn.isStandardColumn() && !sheetColumn.isRetailPriceColumn() && !sheetColumn.isCostColumn() ) {
      sheetColumn.select();
    }

    return this;
  }

  selectAllColumnsAllSheets() {
    this.sheets.forEach( s => s.selectAllColumns() );
  }

  deselectAllColumnsAllSheets() {
    this.sheets.forEach( s => s.deselectAllColumns() );
  }

  setStandardColumnAllSheets(columnName, standardColumnName) {
    console.log(`Setting standard column on all sheets: ${columnName} => ${standardColumnName}`);
    for( const s of this.sheets ) {
      s.setStandardColumn(columnName, standardColumnName);
    }
  }

  getColumnNamesAllSheets() {
    const columnNames = new Set();

    for( let i=0; i<this.sheets.length; i++) {
      this.sheets[i].columns.forEach( c => columnNames.add( c.name ));
    }

    return [...columnNames].sort();
  }

  getUniqueValuesInColumnAllSheets( columnName ) {
    const columnValues = new Set();

    for( let sheet of this.sheets ) {

      if( sheet.columns.find( c => c.name === columnName ) ) {

        for( let _ of sheet.getUniqueValuesInColumn( columnName ) ) {
          columnValues.add( _ );
        }

      }

    }

    return [ ... columnValues ].sort();
  }

  getUniqueBarcodesAllSheets() {
    return this.getUniqueValuesInColumnAllSheets( __STANDARD_MANIFEST_BARCODE_COLUMN__ );
  }

  setActiveSheet(sheetName) {
    this.activeSheet = this.sheets.find( s => s.name == sheetName );
  }

  getActiveSheet() {
    return this.activeSheet;
  }

  addCheckDigitsAllSheets() {
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

  createExcelWorkbook( isPretty ) {
    const wb = xlsx.utils.book_new();
    for( const displaySheet of this.sheets ) {

      let ws;
      let columnHeaders = [];

      if( isPretty ) {

        // Pretty output is an array of arrays of cell objects
        const output = displaySheet.getPrettyOutput();

        if( Array.isArray( output ) && output[0] ) {

          columnHeaders = output[0].map( _ => _.v ); // `v` is the value of the cell

        }

        ws = xlsx.utils.aoa_to_sheet(
          output,
          {}
        );

      }
      else {

        // basic output is an array of objects with keys matching the column headers
        const output = displaySheet.getBasicOutput();

        if( Array.isArray( output ) && output[0] ) {

          columnHeaders = Object.keys( output[0] );

        }

        ws = xlsx.utils.json_to_sheet(
          output,
          {}
        );

      }
      xlsx.utils.book_append_sheet(wb, ws, displaySheet.name);

      // this logic sets the column width based on the size of data entries
      ws['!cols'] = columnHeaders.map( _columnDisplayName => {

        const column = displaySheet.columns.find( _c => _c.displayName === _columnDisplayName );

        return {
          width: displaySheet.getColumnWidth( column.name )
        };
      });

    }
    return wb;
  }

  deleteSheet(sheet) {
    const idx = this.sheets.findIndex( s => s == sheet );
    if(idx >= 0) {
      const removed = this.sheets.splice(idx, 1);
      removed.forEach( _s => _s.unsetManifest() );
      this.activeSheet = this.sheets[0];
    }
  }

  splitActiveSheetByColumn( column ) {

    const sheet = this.getActiveSheet();

    const newSheets = sheet.splitByColumnValues( column );
    this.addSheets( newSheets );

    this.setActiveSheet( newSheets[0].name );
    this.deleteSheet( sheet );

    return newSheets;
  }

  extractFromActiveSheetByColumnValue( column, value ) {

    const sheet = this.getActiveSheet().extractByColumnValue( column, value );

    const manifest = new Manifest();

    manifest.addSheet( sheet );

    return manifest;
  }

  createSalePriceColumnFromRetailPrices( discountFactor, priceType ) {
    for( const s of this.sheets ) {
      s.createSalePriceColumnFromRetailPrices( discountFactor, priceType );
    }
  }

  standardTotals() {
    const sheet = this.sheets[0];

    if( sheet ) {
      return sheet.standardTotals();
    }

  }

  mostExpensiveItem() {
    const sheet = this.sheets[0];

    if( sheet ) {
      return sheet.mostExpensiveItem();
    }
  }

  mostExpensiveItemPrice() {
    const sheet = this.sheets[0];

    if( sheet ) {
      const mostExpensiveItem = sheet.mostExpensiveItem();
      return sheet.getUnitPrice( mostExpensiveItem );
    }
  }

  hasBrandInfo() {
    for( let sheet of this.sheets ) {
      if( sheet.hasBrandInfo() ) {
        return true;
      }
    }
  }
}