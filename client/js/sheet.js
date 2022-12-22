import * as xlsx from 'xlsx-js-style';
import {
  __STANDARD_MANIFEST_PALLET_ID_COLUMN__,
  __STANDARD_MANIFEST_BARCODE_COLUMN__,
  __STANDARD_MANIFEST_QUANTITY_COLUMN__,
  __STANDARD_MANIFEST_DESCRIPTION_COLUMN__,
  __STANDARD_MANIFEST_CATEGORY_COLUMN__,
  __STANDARD_MANIFEST_UNIT_COST_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_COST_COLUMN__,
  __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_COLUMNS__,
  __STANDARD_MANIFEST_DISPLAY_COLUMNS__,
} from './manifest-constants';
import {
  addCheckDigit,
  isNumericString,
  validateCheckDigit,
} from './upc';

// CONSTANTS

const __PRETTY_MANIFEST_CELL_CURRENCY_FORMAT_CODE__ = 7;
const __PRETTY_MANIFEST_CELL_HIGHTLIGHT_COLOR__ = 'FFFF66';
const __PRETTY_MANIFEST_HIGHLIGHTED_CELL_SETTINGS__ = {
  font: {
    bold: true
  },
  fill: {
    fgColor: {
      rgb: __PRETTY_MANIFEST_CELL_HIGHTLIGHT_COLOR__
    }
  },
  border: {
    top: {
      style: "thin",
      color: {
        rgb: "000000"
      }
    },
    bottom: {
      style: "thin",
      color: {
        rgb: "000000"
      }
    },
    left: {
      style: "thin",
      color: {
        rgb: "000000"
      }
    },
    right: {
      style: "thin",
      color: {
        rgb: "000000"
      }
    },
  }
};

// Column class
export class Column {

  constructor( { name, displayName, selected } ) {
    this.name = name;
    this.displayName = displayName || name;
    this.selected = !!selected; // defaults to false
  }

  rename( _name ) {
    this.name = _name;
    this.displayName = _name;
  }

  isStandardColumn() {
    return __STANDARD_MANIFEST_COLUMNS__.includes( this.displayName );
  }

  isPalletIdColumn() {
    return this.displayName === __STANDARD_MANIFEST_PALLET_ID_COLUMN__;
  }

  isBarcodeColumn() {
    return this.displayName === __STANDARD_MANIFEST_BARCODE_COLUMN__;
  }

  isQuantityColumn() {
    return this.displayName === __STANDARD_MANIFEST_QUANTITY_COLUMN__;
  }

  isDescriptionColumn() {
    return this.displayName === __STANDARD_MANIFEST_DESCRIPTION_COLUMN__;
  }

  isCategoryColumn() {
    return this.displayName === __STANDARD_MANIFEST_CATEGORY_COLUMN__;
  }

  isCostColumn() {
    return this.isTotalCostColumn() || this.isUnitCostColumn();
  }

  isTotalCostColumn() {
    return this.displayName === __STANDARD_MANIFEST_TOTAL_COST_COLUMN__;
  }

  isUnitCostColumn() {
    return this.displayName === __STANDARD_MANIFEST_UNIT_COST_COLUMN__;
  }

  isRetailPriceColumn() {
    return this.isTotalRetailPriceColumn() || this.isUnitRetailPriceColumn();
  }

  isTotalRetailPriceColumn() {
    return this.displayName === __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__;
  }

  isUnitRetailPriceColumn() {
    return this.displayName === __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__;
  }

  isSalePriceColumn() {
    return this.isTotalSalePriceColumn() || this.isUnitSalePriceColumn();
  }

  isTotalSalePriceColumn() {
    return this.displayName === __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__;
  }

  isUnitSalePriceColumn() {
    return this.displayName === __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__;
  }

  isSelected() {
    return this.selected;
  }

  select() {
    this.selected = true;
  }

  deselect() {
    this.selected = false;
  }

  toggleSelect() {
    this.selected = !this.selected;
  }

}

// Main class

export class Sheet {
  constructor( { manifest, name, skipFirstRows, skipLastRows, noHeaderRow, data, rows, columns, renameStandardColumns } ) {

    this.manifest = manifest;
    this.name = name;
    this.rawData = data;

    const sheetParseOpts = {
      blankRows: true,
      defVal: '',
      range: skipFirstRows || 0,
    };
    if( noHeaderRow ) {
      sheetParseOpts.header = "A";
    }

    if( rows ) {

      this.rows = rows;

    }
    else if ( this.rawData ) {

      this.rows = xlsx.utils.sheet_to_json( this.rawData, sheetParseOpts );

      if( skipLastRows > 0 ) {
        this.rows.splice( this.rows.length - skipLastRows );
      }

    }
    else {

      throw new Error('Sheet requires `data` or `rows` field.');

    }

    this.rows = this.rows.map( ( r, idx ) => {
      r.idx = idx;
      r.editing = new Set();
      return r;
    });

    // Assign columns if provided or extract from rows
    if( columns ) {
      this.columns = columns;
    }
    else if( this.rows && this.rows[0] ) {

      const columnRenameMapping = {};

      const rowMetadataFields = new Set( [ 'idx', 'editing' ] );
      this.columns = Object.entries( this.rows[0] ).filter( _ => ! rowMetadataFields.has( _[0] ) ).map( kv => {
        let [ name, _ ] = kv;

        if( renameStandardColumns ) {
          // Rename column if it matches a standard column name
          const matchedStandardColumn = __STANDARD_MANIFEST_COLUMNS__.find( column => column === name );
          if( matchedStandardColumn ) {
            const newName = '__' + matchedStandardColumn;
            columnRenameMapping[name] = newName;
            name = newName;
          }
        }

        return new Column( { name: name } );
      });

      if( Object.keys(columnRenameMapping).length ) {
        this.rows.forEach( row => {
          for( let [ oldName, newName ] of Object.entries(columnRenameMapping) ) {
            row[newName] = row[oldName];
            delete row[oldName];
          }
        });
      }
      this.selectAllColumns();

    }
    else {
      this.columns = [];
    }

    this.updateColumnTitleOptions();
    this.cleanBarcodeColumn();
  }

  removeRow( idx ) {
    this.rows.splice( idx, 1 );
  }

  getManifest() {
    return this.manifest;
  }

  setManifest( _manifest ) {
    return this.manifest = _manifest;
  }

  unsetManifest() {
    if( this.manifest ) {
      delete this.manifest;
    }
  }

  getBarcodeColumn() {
    return this.columns.find( column => column.isBarcodeColumn() );
  }

  getQuantityColumn() {
    return this.columns.find( column => column.isQuantityColumn() );
  }

  getDescriptionColumn() {
    return this.columns.find( column => column.isDescriptionColumn() );
  }

  getUnitCostColumn() {
    return this.columns.find( column => column.isUnitCostColumn() );
  }

  getTotalCostColumn() {
    return this.columns.find( column => column.isTotalCostColumn() );
  }

  getUnitRetailPriceColumn() {
    return this.columns.find( column => column.isUnitRetailPriceColumn() );
  }

  getTotalRetailPriceColumn() {
    return this.columns.find( column => column.isTotalRetailPriceColumn() );
  }

  getUnitSalePriceColumn() {
    return this.columns.find( column => column.isUnitSalePriceColumn() );
  }

  getTotalSalePriceColumn() {
    return this.columns.find( column => column.isTotalSalePriceColumn() );
  }

  selectAllColumns() {

    this.columns.forEach( c => c.select() );

  }

  deselectAllColumns() {

    this.columns.forEach( c => c.deselect() );

  }

  updateColumnDisplayName( column ) {
    if( column.isStandardColumn() && !column.isRetailPriceColumn() && !column.isCostColumn() ) {
      column.select();
    }
    this.updateColumnTitleOptions();
    this.cleanBarcodeColumn();
  }

  updateColumnTitleOptions() {
    // This computes an object which maps original column names to the display name it has been changed to
    const standardColumnAssignments = this.columns.reduce( (acc, column) => {
      if(column.displayName && column.displayName !== column.name) {
        acc[column.name] = column.displayName;
      }
      return acc;
    }, {});

    this.columns.forEach( currentColumn => {

      if( currentColumn.isSalePriceColumn() ) {

        currentColumn.nameOptions = [];

      }
      else {

        currentColumn.nameOptions = Object.assign( [ ], __STANDARD_MANIFEST_DISPLAY_COLUMNS__ ) ;

        for( let [columnName, displayName] of Object.entries(standardColumnAssignments) ) {
          if( columnName !== currentColumn.name ) {
            const foundIndex = currentColumn.nameOptions.findIndex( option => option === displayName );
            if( foundIndex >= 0 ) {
              currentColumn.nameOptions.splice( foundIndex, 1 );
            }
          }
        }

      }

    });

  }

  setStandardColumn( columnName, standardColumnName ) {
    const column = this.columns.find( c => c.name === columnName );
    if( column ) {
      column.displayName = standardColumnName;
      if( !column.isRetailPriceColumn() ) {
        column.select();
      }
    }
  }


  renameColumn( name, newName ) {

    const column = this.columns.find( c => c.name === name );
    if( column && name !== newName ) {
      column.rename( newName );
      this.rows.forEach( _row => {
        _row[ newName ] = _row[ name ];
        delete _row[ name ];
      });
    }

    return column;
  }

  selectColumnByName( columnName ) {

    const column = this.columns.find( c => c.name === columnName );

    if( column ) {
      column.select();
    }

  }

  getCellClass( row, column ) {
    const _class = {};
    try {
      if( column.isSelected() && ! this.isEditing( row, column ) ) {
        _class.warning = true;
      }
    }
    catch(e) {
      console.error(e);
    }
    return _class;
  }

  cellUpcCheckDigitValid( row, column ) {
    let isValid = false;
    try {

      const barcode = `${ row[ column.name ] }`; // ensure the barcode is a string

      if( barcode && isNumericString( barcode ) && validateCheckDigit( barcode ) ) { //filter out malformed

        isValid = true;

      }

    }
    catch(e) {
      console.error(e);
    }
    return isValid;
  }

  cellUpcLengthValid( row, column ) {
    let isValid = false;
    try {

      const barcode = `${ row[ column.name ] }`; // ensure the barcode is a string

      if( barcode && isNumericString( barcode ) && barcode.length >= 12 ) { //filter out malformed

        isValid = true;

      }

    }
    catch(e) {
      console.error(e);
    }
    return isValid;
  }

  cleanBarcodeColumn() {
    const barcodeColumn = this.getBarcodeColumn();
    if(barcodeColumn) {
      for(const r of this.rows) {
        try {

          r[barcodeColumn.name] = `${ r[barcodeColumn.name] }`.replace(/\D/g, ''); // ensure the barcode is a string then remove non-digits

        }
        catch(e) {
          console.log(e);
          console.log(r);
        }
      }
    }
  }

  prependUpcZerosOneRow( row, barcodeColumnName ) {
    row[barcodeColumnName] =  `${ '0'.repeat( 12 - row[barcodeColumnName].length ) }${row[barcodeColumnName]}`;
  }

  prependUpcZeros() {
    const barcodeColumn = this.getBarcodeColumn();
    if(barcodeColumn) {
      for(const r of this.rows) {
        try {

          r[barcodeColumn.name] = `${ r[barcodeColumn.name] }`; // ensure the barcode is a string

          if( validateCheckDigit( r[barcodeColumn.name] ) && r[barcodeColumn.name].length < 12 && r[barcodeColumn.name].length > 8 ) {

            r[barcodeColumn.name] =  `${ '0'.repeat( 12 - r[barcodeColumn.name].length ) }${r[barcodeColumn.name]}`;

          }

        }
        catch(e) {
          console.log(e);
          console.log(r);
        }
      }
    }
  }

  addCheckDigits() {
    const barcodeColumn = this.getBarcodeColumn();
    if(barcodeColumn) {
      for(const r of this.rows) {
        try {

          r[barcodeColumn.name] = `${ r[barcodeColumn.name] || '' }`; // ensure the barcode is a string

          r[barcodeColumn.name] = addCheckDigit(r[barcodeColumn.name]);

        }
        catch(e) {
          console.log(e);
          console.log(r);
        }
      }
    }
  }

  barcodeColumnHasCheckDigits() {

    /*

    This is a somewhat delicate and subjective test.

    Define

        fractionRowsFailingValidation ==> fraction of (non-empty) rows whose last digit does not satisfy the check digit calculation for the preceding digits

    and

        fractionRowsPassingValidation ==> fraction of (non-empty) rows whose last digit does satisfies the check digit calculation for the preceding digits

    Naturally,

        fractionRowsPassingValidation = 1 - fractionRowsFailingValidation

    If there are no data errors then we would expect fractionRowsFailingValidation to be exactly zero **if check digits are present** on this sheet.
    However, we must allow some leeway in the inevitable case of some errors in the raw data. Therefore, **when check digits are present** we wish

        fractionRowsFailingValidation < __DATA_ERROR_TOLERANCE__     ( **check digits are present** )

    for some smallish __DATA_ERROR_TOLERANCE__, say,

        __DATA_ERROR_TOLERANCE__ = 0.1

    Conversely, **if check digits are not present**, the natural expectation is that fractionRowsFailingValidation is exactly 1. However, this ignores that
    there will inevitably be false positives to validation where the final digit just happens to satisfy validation although it isn't really the check digit.
    In that case, **when check digits are NOT present** we wish the fraction of rows passing to satisfy

        fractionRowsPassingValidation < __FALSE_POSITIVE_TOLERANCE__

    or

        fractionRowsFailingValidation > 1 - __FALSE_POSITIVE_TOLERANCE__

    for some __FALSE_POSITIVE_TOLERANCE__, although it isn't clear what value to choose here. While false positives occur for only 10% of all possible codes,
    some manifests -- especially with a small number of lines -- may just happen to have much larger percentage of rows with false positives. However, it
    seems reasonable that

        1 - __FALSE_POSITIVE_TOLERANCE__ > __DATA_ERROR_TOLERANCE__

    To see why, note that for the smallish value of __DATA_ERROR_TOLERANCE__ = 0.1, one would need a false positive tolerance over 90% to violate this inequality.
    While we do wish to tolerate a fairly liberal amount of false positives, __FALSE_POSITIVE_TOLERANCE__ is surely not as large as that.

    Therefore, **when check digits are NOT present** we'd like

        fractionRowsFailingValidation > 1 - __FALSE_POSITIVE_TOLERANCE__ > __DATA_ERROR_TOLERANCE__      ( **check digits are not present** )

    Thus we only need to compare fractionRowsFailingValidation against __DATA_ERROR_TOLERANCE__ to get a sufficient test for whether or not the barcode column already
    has check digits added.

    */

    const barcodeColumn = this.getBarcodeColumn();

    // some rows may be blank so filter out
    const nonEmptyRows = this.rows.filter( _row => _row[ barcodeColumn.name ] );

    const numNonEmptyRows = nonEmptyRows.length;
    const numRowsFailingValidation = nonEmptyRows.reduce( ( _num, _row ) => _num + ( this.cellUpcCheckDigitValid( _row, barcodeColumn ) ? 0 : 1 ), 0);

    const fractionRowsFailingValidation = numRowsFailingValidation / numNonEmptyRows;
    const __DATA_ERROR_TOLERANCE__ = 0.1; // The maximum percentage of rows that might just have data errors despite check digits being largely present

    return fractionRowsFailingValidation <= __DATA_ERROR_TOLERANCE__ ;
  }

  normalizeBarcodeColumn() {

    if( this.barcodeColumnHasCheckDigits() ) {
      return;
    }

    const barcodeColumn = this.getBarcodeColumn();
    for( let r of this.rows ) {

      if( !r[ barcodeColumn.name ] ) {
        continue;
      }

      r[barcodeColumn.name] = `${ r[barcodeColumn.name] || '' }`; // ensure the barcode is a string

      r[barcodeColumn.name] = addCheckDigit( r[barcodeColumn.name] );

      if( r[barcodeColumn.name].length < 12 && r[barcodeColumn.name].length > 8 ) {
        this.prependUpcZerosOneRow( r, barcodeColumn.name );
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

  getUniqueValuesInColumn( columnName ) {
    const values = this.rows.map( r => r[ columnName ] ).filter( _ => typeof _ !== 'undefined' );
    return [ ... new Set( values ) ];
  }

  filterRowDataForOutput(row) {

    const columnNameMapping = this.columns.reduce( (mapping, column) => {
      mapping[ column.displayName ] = column.name;
      return mapping;
    }, {});

    const out = {};

    const outputColumnNames = this.columns.filter( c => c.isSelected() ).map( c => c.displayName );
    outputColumnNames.sort((a, b) => {
      const aIndex = __STANDARD_MANIFEST_COLUMNS__.indexOf(a);
      const bIndex = __STANDARD_MANIFEST_COLUMNS__.indexOf(b);
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
    if( row[ __STANDARD_MANIFEST_BARCODE_COLUMN__ ] ) {
      row[ __STANDARD_MANIFEST_BARCODE_COLUMN__ ] = `'${row[ __STANDARD_MANIFEST_BARCODE_COLUMN__ ]}`;
    }
    return row;
  }

  getBasicOutput() {
    const filter = this.filterRowDataForOutput.bind(this);
    const hack = this.upcColumnHack.bind(this);
    return this.rows.map( filter ).map( hack );
  }

  isNumericalColumnName( columnName ) {
    switch ( columnName ) {
      case __STANDARD_MANIFEST_QUANTITY_COLUMN__:
      case __STANDARD_MANIFEST_UNIT_COST_COLUMN__:
      case __STANDARD_MANIFEST_TOTAL_COST_COLUMN__:
      case __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__:
      case __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__:
      case __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__:
      case __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__:
        return true;
      default:
        return false;
    }
  }

  isCurrencyColumnName( columnName ) {
    switch ( columnName ) {
      case __STANDARD_MANIFEST_UNIT_COST_COLUMN__:
      case __STANDARD_MANIFEST_TOTAL_COST_COLUMN__:
      case __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__:
      case __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__:
      case __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__:
      case __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__:
        return true;
      default:
        return false;
    }
  }

  getPrettyTotalsRowArray( headerRowArray ) {

    const totals = this.standardTotals();

    const totalsRowArray = [];

    const quantityIdx = headerRowArray.findIndex( _ => _.v === __STANDARD_MANIFEST_QUANTITY_COLUMN__ );
    if( quantityIdx > -1 && totals.quantity ) {
      totalsRowArray[ quantityIdx ] = {
        v: totals.quantity,
        t: 'n',
        s: __PRETTY_MANIFEST_HIGHLIGHTED_CELL_SETTINGS__,
      };
    }

    const totalRetailValueIdx = headerRowArray.findIndex( _ => _.v === __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ );
    if( totalRetailValueIdx > -1 && totals.retailValue ) {
      totalsRowArray[ totalRetailValueIdx ] = {
        v: totals.retailValue,
        t: 'n',
        s: Object.assign( {}, __PRETTY_MANIFEST_HIGHLIGHTED_CELL_SETTINGS__, { numFmt: __PRETTY_MANIFEST_CELL_CURRENCY_FORMAT_CODE__ } ),
      };
    }

    const totalSalePriceIdx = headerRowArray.findIndex( _ => _.v === __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__ );
    if( totalSalePriceIdx > -1 && totals.salePrice ) {
      totalsRowArray[ totalSalePriceIdx ] = {
        v: totals.salePrice,
        t: 'n',
        s: Object.assign( {}, __PRETTY_MANIFEST_HIGHLIGHTED_CELL_SETTINGS__, { numFmt: __PRETTY_MANIFEST_CELL_CURRENCY_FORMAT_CODE__ } ),
      };
    }

    return totalsRowArray;

  }

  jsonToStyledAoa( rows ) {

    const headerRowArray = [];
    // const columnNames = Object.keys( rows[0] );
    for( let key of Object.keys( rows[0] ) ) {
      headerRowArray.push({
        v: key,
        s: __PRETTY_MANIFEST_HIGHLIGHTED_CELL_SETTINGS__,
      });
    }

    // deep copy
    const dataRowsJson = JSON.parse( JSON.stringify( rows ) );

    if( dataRowsJson.length && dataRowsJson[0][ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] ) {
      //sort descending by total retail price if available
      dataRowsJson.sort( (a,b) => {
        if ( a[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] && b[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] ) {
          return b[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] - a[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ];
        }
        else if ( a[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] ) {
          return -1;
        }
        else if ( b[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] ) {
          return +1;
        }
        else {
          return 0;
        }
      });
    }

    const dataRowsAoa = [];

    for( let row of dataRowsJson ) {

      const cellArray = [];

      for( let [ key, value ] of Object.entries( row ) ) {

        const cell = {
          v: value,
          s: {}
        };

        if( this.isNumericalColumnName( key ) ) {
          cell.t = 'n';
        }

        if( this.isCurrencyColumnName( key ) ) {
          cell.s.numFmt = __PRETTY_MANIFEST_CELL_CURRENCY_FORMAT_CODE__; // numbers formatted like currency with $'s, commas and two place decimals
        }

        const cellIdx = headerRowArray.findIndex( _ => _.v === key );
        cellArray[ cellIdx ] = cell;

      }

      dataRowsAoa.push( cellArray );

    }

    const totalsRowArray = this.getPrettyTotalsRowArray( headerRowArray );

    const res = [ headerRowArray ].concat( dataRowsAoa );
    if( totalsRowArray.length ) {
      res.push( totalsRowArray );
    }

    return res;
  }

  getPrettyOutput() {
    const filter = this.filterRowDataForOutput.bind(this);
    const hack = this.upcColumnHack.bind(this);
    const rows = this.rows.map( filter ).map( hack );
    return this.jsonToStyledAoa( rows );
  }

  splitByColumnValues( column, ignoreFalseyValues ) {

    const commonOpts = {
      standardBarcodeColumnName: __STANDARD_MANIFEST_BARCODE_COLUMN__,
      standardColumnNames: __STANDARD_MANIFEST_COLUMNS__,
      skipFirstRows: false,
      noHeaderRow: false,
    };

    const groups = {};

    for( let r of this.rows ) {

      const groupId = r[ column ];

      if( ignoreFalseyValues && !groupId ) {
        continue;
      }

      if( groups[ groupId ] ) {

        groups[ groupId ].push( r );

      }
      else {

        groups[ groupId ] = [ r ];

      }

      delete r[ column ];

    }

    const newSheets = [];
    for( let [ groupId, group ] of Object.entries( groups ) ) {

      const clonedColumns = this.columns.filter( _c => _c.name !== column ).map( _c => new Column( { name: _c.name, displayName: _c.displayName, selected: _c.selected } ) );

      const opts = Object.assign(
        commonOpts,
        {
          name: `${groupId}`.slice(0,31), // there's a max number of characters for a sheet name
          rows: group,
          columns: clonedColumns
        },
      );

      const s = new Sheet( opts );

      newSheets.push( s );

    }

    return newSheets;

  }

  extractByColumnValue( column, value ) {

    const commonOpts = {
      standardBarcodeColumnName: __STANDARD_MANIFEST_BARCODE_COLUMN__,
      standardColumnNames: __STANDARD_MANIFEST_COLUMNS__,
      skipFirstRows: false,
      noHeaderRow: false,
    };

    const group = [];

    for( let r of this.rows ) {

      if( r[ column ] === value ) {

        group.push( r );
        delete r[ column ];

      }

    }

    const clonedColumns = this.columns.filter( _c => _c.name !== column ).map( _c => new Column( { name: _c.name, displayName: _c.displayName, selected: _c.selected } ) );

    const opts = Object.assign(
      commonOpts,
      {
        name: `${value}`.slice(0,31), // there's a max number of characters for a sheet name
        rows: group,
        columns: clonedColumns
      },
    );

    const s = new Sheet( opts );

    return s;

  }

  isEditing( row, column ) {
    return row.editing.has( column.name );
  }

  startCellEdit( row, column ) {
    row.editing.add( column.name );
  }

  endCellEdit( row, column ) {
    row.editing.delete( column.name );
  }

  hasCostColumn() {
    return this.columns.some( _c => _c.isUnitCostColumn() ) || this.columns.some( _c => _c.isTotalCostColumn() );
  }

  canComputeSalePriceColumn( priceType ) {

    if( priceType === 'unit' ) {
      return this.columns.some( _c => _c.isUnitRetailPriceColumn() ) || ( this.columns.some( _c => _c.isTotalRetailPriceColumn() ) && this.columns.some( _c => _c.isQuantityColumn() ) );
    }
    else if ( priceType === 'total' ) {
      return this.columns.some( _c => _c.isTotalRetailPriceColumn() ) || ( this.columns.some( _c => _c.isUnitRetailPriceColumn() ) && this.columns.some( _c => _c.isQuantityColumn() ) );
    }

  }

  createSalePriceColumnFromRetailPrices( discountFactor, priceType ) {

    if( priceType !== 'unit' && priceType !== 'total' ) {
      return;
    }

    if( !this.canComputeSalePriceColumn( priceType ) ) {
      return;
    }

    const quantityColumn = this.columns.find( _c => _c.isQuantityColumn() );
    const totalRetailPriceColumn = this.columns.find( _c => _c.isTotalRetailPriceColumn() );
    const unitRetailPriceColumn = this.columns.find( _c => _c.isUnitRetailPriceColumn() );
    const priceColumnName = ( priceType === 'unit' ) ? __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__ : __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__;

    const oldPriceColumnIdx = this.columns.findIndex( _c => _c.name === priceColumnName );
    if( oldPriceColumnIdx >= 0 ) {
      this.columns.splice( oldPriceColumnIdx, 1 );
    }

    const priceColumn = new Column( { name: priceColumnName } );
    priceColumn.select();

    this.columns.push( priceColumn );

    let cb;
    if ( priceType === 'unit' && unitRetailPriceColumn ) {

      cb = r => {
        if( r[ unitRetailPriceColumn.name ] ) {
          r[ priceColumn.name ] = discountFactor * parseFloat( r[ unitRetailPriceColumn.name ] );
        }
      };

    }
    else if ( priceType == 'unit' && totalRetailPriceColumn ) {

      cb = r => {
        if( r[ totalRetailPriceColumn.name ] && r[ quantityColumn.name ] ) {
          r[ priceColumn.name ] = discountFactor * parseFloat( r[ totalRetailPriceColumn.name ] ) / parseFloat( r[ quantityColumn.name ] );
        }
      };

    }
    else if ( priceType === 'total' && unitRetailPriceColumn ) {

      cb = r => {
        if( r[ unitRetailPriceColumn.name ] && r[ quantityColumn.name ] ) {
          r[ priceColumn.name ] = discountFactor * parseFloat( r[ unitRetailPriceColumn.name ] ) * parseFloat( r[ quantityColumn.name ] );
        }
      };

    }
    else if ( priceType === 'total' && totalRetailPriceColumn ) {

      cb = r => {
        if( r[ totalRetailPriceColumn.name ] ) {
          r[ priceColumn.name ] = discountFactor * parseFloat( r[ totalRetailPriceColumn.name ] );
        }
      };

    }
    else {
      return;
    }

    this.rows.forEach( cb );

  }

  numRows() {
    return this.rows.length;
  }

  numColumns() {
    return this.columns.length;
  }

  sumColumnValues( columnName ) {

    let total = 0;
    for( let r of this.rows ) {

      total = Number.isFinite( r[ columnName ] ) ? total + r[ columnName ] : total;

    }

    return total;
  }

  sumTotalValueFromUnitColumnValues( unitValueColumnName ) {

    let total = 0;

    const quantityColumn = this.getQuantityColumn();

    if( quantityColumn ) {

      for( let r of this.rows ) {

        total = Number.isFinite( r[ unitValueColumnName ]) && Number.isFinite( r[ quantityColumn.displayName ] ) ? total + r[ unitValueColumnName ]*r[ quantityColumn.displayName ] : total;

      }

    }

    return total;

  }

  getUniformCategory() {

    const firstRowCategory = this.rows[0]['Category'];
    let allCategoriesSame = false;

    if( firstRowCategory ) {
      allCategoriesSame = this.rows.every( r => r['Category'] === firstRowCategory );
    }

    return allCategoriesSame ? firstRowCategory : null;
  }

  standardTotals() {
    const res = {};

    const quantityColumn = this.getQuantityColumn();
    if( quantityColumn ) {
      res.quantity = this.sumColumnValues( quantityColumn.displayName );
    }

    const unitCostColumn = this.getUnitCostColumn();
    const totalCostColumn = this.getTotalCostColumn();
    if( unitCostColumn ) {
      res.cost = this.sumTotalValueFromUnitColumnValues( unitCostColumn.displayName );
    }
    else if( totalCostColumn ) {
      res.cost = this.sumColumnValues( totalCostColumn.displayName );
    }

    const unitRetailPriceColumn = this.getUnitRetailPriceColumn();
    const totalRetailPriceColumn = this.getTotalRetailPriceColumn();
    if( unitRetailPriceColumn ) {
      res.retailValue = this.sumTotalValueFromUnitColumnValues( unitRetailPriceColumn.displayName );
    }
    else if( totalRetailPriceColumn ) {
      res.retailValue = this.sumColumnValues( totalRetailPriceColumn.displayName );
    }

    const unitSalePriceColumn = this.getUnitSalePriceColumn();
    const totalSalePriceColumn = this.getTotalSalePriceColumn();
    if( unitSalePriceColumn ) {
      res.salePrice = this.sumTotalValueFromUnitColumnValues( unitSalePriceColumn.displayName );
    }
    else if( totalSalePriceColumn ) {
      res.salePrice = this.sumColumnValues( totalSalePriceColumn.displayName );
    }

    const sheetCategory = this.getUniformCategory();
    if( sheetCategory ) {
      res.category = sheetCategory;
    }

    return res;
  }

  getLineItemByBarcode( barcode ) {
    return this.rows.find( _r => _r[ __STANDARD_MANIFEST_BARCODE_COLUMN__ ] === barcode );
  }

  getLineItemIndexByBarcode( barcode ) {
    return this.rows.findIndex( _r => _r[ __STANDARD_MANIFEST_BARCODE_COLUMN__ ] === barcode );
  }

  // Note that amount is signed!
  adjustLineItemQuantity( barcode, amount, keepZeroQuantity ) {
    const idx = this.getLineItemIndexByBarcode( barcode );
    if( idx >= 0 ) {

      const row = this.rows[ idx ];

      // update retail price - must be done before adjusting the row quantity
      if( row[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ]  && row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ] ) {

        /* eslint-disable indent */
        const unitRetailPrice = row[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] && row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ]
                                ? row[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] / row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ]
                                : 0;
        /* eslint-enable indent */

        row[ __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ ] += amount * unitRetailPrice;

      }

      // update sale price - must be done before adjusting the row quantity
      if( row[ __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__ ]  && row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ] ) {

        /* eslint-disable indent */
        const unitSalePrice = row[ __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__ ] && row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ]
                              ? row[ __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__ ] / row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ]
                              : 0;
        /* eslint-enable indent */

        row[ __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__ ] += amount * unitSalePrice;

      }

      // adjust quantity
      if( row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ] ) {

        row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ] += amount;

        if( !keepZeroQuantity && row[ __STANDARD_MANIFEST_QUANTITY_COLUMN__ ] <= 0 ) {
          this.removeRow( idx );
        }

      }

    }

  }

}