import * as xlsx from 'xlsx';

// CONSTANTS

const __STANDARD_MANIFEST_BARCODE_COLUMN__ = 'UPC/EAN/GTIN';
const __STANDARD_MANIFEST_QUANTITY_COLUMN__ = 'Quantity';
const __STANDARD_MANIFEST_UNIT_COST_COLUMN__ = 'Unit Cost'; // our cost per unit
const __STANDARD_MANIFEST_TOTAL_COST_COLUMN__ = 'Cost'; // our total cost for the line item (unit price * quantity)
const __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__ = 'Unit Retail Price'; // estimated retail unit price
const __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__ = 'Retail Price';  // estimated retail value of line item
const __STANDARD_MANIFEST_DISPLAY_COLUMNS__ = [
  __STANDARD_MANIFEST_BARCODE_COLUMN__,
  __STANDARD_MANIFEST_QUANTITY_COLUMN__,
  __STANDARD_MANIFEST_UNIT_COST_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_COST_COLUMN__,
  __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__,
  'Description',
  'Image',
];

const __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__ = 'Unit Sale Price'; // what we are selling it for per unit
const __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__ = 'Sale Price';  // what we are selling the line item for
const __STANDARD_MANIFEST_COLUMNS__ = __STANDARD_MANIFEST_DISPLAY_COLUMNS__.concat([
  __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__,
]);

// Helpers

function calculateCheckDigit(upc) {
  upc = upc.split('').reverse().join('');
  let total = 0;
  for(let i=0; i<upc.length; i++) {
    if(i % 2===0) {
      total = total + 3*parseInt(upc[i]);
    }
    else {
      total = total + parseInt(upc[i]);
    }
  }
  //Check digit is the remainder after subtracting above sum from nearest (larger or equal) multiple of ten.
  if(parseInt(total/10)===total/10) {//Total is multiple of 10
    return 0;
  }
  else {
    return (parseInt(total/10)+1)*10 -total;
  }
}


// Checks if the barcode includes a check digit
function validateCheckDigit(barcode) {
  if( !isNumericString( barcode ) ) {
    return false;
  }
  const lastIdx = barcode.length-1;
  return calculateCheckDigit(barcode.slice(0, lastIdx))==barcode[lastIdx];// use == since we are comparing a string to a number
}

const isDigit = c => ('0123456789'.split('')).includes(c);
const isNumericString = s => s.split('').every(isDigit);

function addCheckDigit(barcode) {

  // return unaltered barcode if not a numeric string
  if( !barcode || !isNumericString( barcode ) ) {
    return barcode;
  }

  return barcode + calculateCheckDigit(barcode);
}


// Column class
class Column {

  constructor( name ) {
    this.name = name;
    this.displayName = name;
    this.selected = false;
  }

  isStandardColumn() {
    return __STANDARD_MANIFEST_COLUMNS__.includes( this.displayName );
  }

  isBarcodeColumn() {
    return this.displayName === __STANDARD_MANIFEST_BARCODE_COLUMN__;
  }

  isQuantityColumn() {
    return this.displayName === __STANDARD_MANIFEST_QUANTITY_COLUMN__;
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
  constructor( { manifest, name, skipFirstRows, noHeaderRow, data, rows, selectedColumns, standardColumns } ) {

    this.manifest = manifest;
    this.name = name;
    this.rawData = data;

    this.getBarcodeColumn = function() {
      return this.columns.find( column => column.isBarcodeColumn() );
    };

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

    }
    else {

      throw new Error('Sheet requires `data` or `rows` field.');

    }

    this.rows = this.rows.map( ( r, idx ) => {
      r.idx = idx;
      r.editing = new Set();
      return r;
    });

    if( this.rows && this.rows[0] ) {
      const columnRenameMapping = {};

      const rowMetadataFields = new Set( [ 'idx', 'editing' ] );
      this.columns = Object.entries( this.rows[0] ).filter( _ => ! rowMetadataFields.has( _[0] ) ).map( kv => {
        let [ name, _ ] = kv;

        // Rename column if it matches a standard column name
        const matchedStandardColumn = __STANDARD_MANIFEST_COLUMNS__.find( column => column === name );
        if( matchedStandardColumn ) {
          const newName = '__' + matchedStandardColumn;
          columnRenameMapping[name] = newName;
          name = newName;
        }

        return new Column( name );
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

    if( standardColumns ) {

      for( let [ columnName, standardColumnName ] of standardColumns ) {

        this.setStandardColumn( columnName, standardColumnName );

      }

    }

    if( selectedColumns ) {

      for( let columnName of selectedColumns ) {

        this.selectColumnByName( columnName );

      }

    }
  }

  updateColumnDisplayName( column ) {
    if( column.isStandardColumn() && !column.isRetailPriceColumn() ) {
      column.select();
    }
    this.updateColumnTitleOptions();
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
      
      if( barcode && isNumericString( barcode) && barcode.length >= 12 ) { //filter out malformed

        isValid = true;

      }

    }
    catch(e) {
      console.error(e);
    }
    return isValid;
  }

  
  prependUpcZeros() {
    const barcodeColumn = this.getBarcodeColumn();
    if(barcodeColumn) {
      for(const r of this.rows) {
        try {

          r[barcodeColumn.name] = `${ r[barcodeColumn.name] }`; // ensure the barcode is a string

          if( validateCheckDigit( r[barcodeColumn.name] ) && r[barcodeColumn.name].length < 12 ) {
            
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
    const values = this.rows.map( r => r[ columnName ] ).filter( _ => angular.isDefined(_) );
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

  getOutput() {
    const filter = this.filterRowDataForOutput.bind(this);
    const hack = this.upcColumnHack.bind(this);
    return this.rows.map( filter ).map( hack );
  }

  splitByColumn( column ) {

    const commonOpts = {
      manifest: this.manifest,
      standardBarcodeColumnName: __STANDARD_MANIFEST_BARCODE_COLUMN__,
      standardColumnNames: __STANDARD_MANIFEST_COLUMNS__,
      skipFirstRows: false,
      noHeaderRow: false,
    };

    const groups = {};

    for( let r of this.rows ) {

      const groupId = r[ column ];

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

      const opts = Object.assign(
        commonOpts,
        {
          name: `${groupId}`.slice(0,31), // there's a max number of characters for a sheet name
          rows: group,
          selectedColumns: this.columns.filter( c => c.isSelected() ).map( c => c.name ),
          standardColumns: this.columns.filter( c => c.isStandardColumn() ).map( c => [ c.name, c.displayName ] )
        },
      );

      const s = new Sheet( opts );

      newSheets.push( s );

    }

    return newSheets;

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

    const priceColumn = new Column( priceColumnName );
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

}