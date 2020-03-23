import * as xlsx from 'xlsx';

export class Manifest {
  constructor() {
    this.sheets = [];
    this.activeSheet = null;
  }
  addSheet(sheet) {
    this.sheets.push(sheet);
    if(this.sheets.length===1) {
      this.activeSheet = this.sheets[0];
    }
  }

  setStandardColumnAllSheets(columnName, standardColumnName) {
    console.log(`Setting standard column on all sheets: ${columnName} => ${standardColumnName}`);
    for( const s of this.sheets ) {
      s.setStandardColumn(columnName, standardColumnName);
    }
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