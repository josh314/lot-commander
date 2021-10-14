import angular from 'angular';

import * as path from 'path';

import * as xlsx from 'xlsx';

import * as api from '../../api';
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

    let _manifest = null;

    return {
      create: create,
      get: get,
      isManifestFile: isManifestFile,
      parse: parse,
      parseFile: parseFile,
    };

    function get() {
      return _manifest;
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

    function parseFile( file, { noHeaderRow, skipFirstRows } = {} ) {

      return $q.when( readFile( file ) ).then( reader => {
        return parse( reader.result, { noHeaderRow, skipFirstRows } );
      });

    }

    function parse( data, { noHeaderRow, skipFirstRows } = {} ) {

      const wb = xlsx.read( new Uint8Array( data ) , { type: 'array' } );

      _manifest = new Manifest();

      for( const [name, data] of Object.entries(wb.Sheets) ) {
        const sheetOpts = {
          manifest: _manifest,
          name: name,
          data: data,
          noHeaderRow: noHeaderRow || false,
          skipFirstRows: skipFirstRows || 0,
          standardColumnNames: __STANDARD_MANIFEST_COLUMNS__,
          standardBarcodeColumnName: __STANDARD_MANIFEST_BARCODE_COLUMN__,
        };
        _manifest.addSheet( new Sheet(sheetOpts) );
      }

      return get();

    }

    function create( filename ) {

      ManifestFileOptionsModal.launch(
        // modal data
        {
          filename,
          sheetNames: _manifest.sheets.map( s => ( { old: s.name, new: s.name } ) )
        },
        // callback upon modal closing
        ( manifestOptions ) => {
          if(!manifestOptions) {
            return;
          }
          for(const sheetName of manifestOptions.sheetNames) {
            if(sheetName.old!=sheetName.new) {
              _manifest.renameSheet(sheetName.old, sheetName.new);
            }
          }
    
          const wb = _manifest.createExcelWorkbook();
          xlsx.writeFile( wb, manifestOptions.filename );
    
        }
    
      );

    }

  }

]);
