import angular from 'angular';

import * as path from 'path';

import * as xlsx from 'xlsx';

import { Sheet } from '../../sheet';
import { Manifest } from '../../manifest';

const readFile = (file = {}, method = 'readAsArrayBuffer') => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader[method](file);
    reader.onload = () => {
      resolve(reader);
    };
    reader.onerror = (error) => reject(error);
  });
};

/******************* Manifest File Handler service ******************************/
angular.module('myApp').factory( 'ManifestFileHandlerSvc', [ '$q', '__STANDARD_MANIFEST_COLUMNS__', '__STANDARD_MANIFEST_BARCODE_COLUMN__', 'ManifestFileOptionsModal',

  function( $q,  __STANDARD_MANIFEST_COLUMNS__, __STANDARD_MANIFEST_BARCODE_COLUMN__, ManifestFileOptionsModal ) {

    this._manifest = null;

    return {
      download: download,
      get: get,
      isManifestFile: isManifestFile,
      parse: parse,
    };

    function get() {
      return this._manifest;
    }

    function isManifestFile( filename ) {
      const manifestExtensions = [
        '.xls',
        '.xlsx',
        '.xlsb',
        '.xlsm',
        '.csv',
        '.tsv'
      ];
      return manifestExtensions.includes( path.extname( filename ) );
    }

    function parse( file, { noHeaderRow, skipFirstRows } = {} ) {

      return $q.when( readFile( file ) ).then( reader => {
        const data = new Uint8Array( reader.result );
        const wb = xlsx.read( data, { type: 'array' } );

        delete this._manifest;
        this._manifest = new Manifest();

        for( const [name, data] of Object.entries(wb.Sheets) ) {
          const sheetOpts = {
            manifest: this._manifest,
            name: name,
            data: data,
            noHeaderRow: noHeaderRow || false,
            skipFirstRows: skipFirstRows || 0,
            standardColumnNames: __STANDARD_MANIFEST_COLUMNS__,
            standardBarcodeColumnName: __STANDARD_MANIFEST_BARCODE_COLUMN__,
          };
          this._manifest.addSheet( new Sheet(sheetOpts) );
        }

        return this.get();
      } );

    }

    function download( filename ) {

      ManifestFileOptionsModal.launch(
        // modal data
        {
          filename,
          sheetNames: this._manifest.sheets.map( s => ( { old: s.name, new: s.name } ) )
        },
        // callback upon modal closing
        ( manifestOptions ) => {
          if(!manifestOptions) {
            return;
          }
          for(const sheetName of manifestOptions.sheetNames) {
            if(sheetName.old!=sheetName.new) {
              this._manifest.renameSheet(sheetName.old, sheetName.new);
            }
          }
    
          const wb = this._manifest.createExcelWorkbook();
          xlsx.writeFile( wb, manifestOptions.filename );
    
        }
    
      );

    }

  }

]);
