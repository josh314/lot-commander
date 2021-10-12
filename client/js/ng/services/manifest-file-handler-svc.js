import angular from 'angular';
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
angular.module('myApp').factory( 'ManifestFileHandler', [ '$q', '__STANDARD_MANIFEST_COLUMNS__', '__STANDARD_MANIFEST_BARCODE_COLUMN__', 'ManifestFileOptionsModal',

  function( $q,  __STANDARD_MANIFEST_COLUMNS__, __STANDARD_MANIFEST_BARCODE_COLUMN__, ManifestFileOptionsModal ) {

    return {
      download: download,
      load: load,
    };

    function load( file, { noHeaderRow, skipFirstRows } = {} ) {

      return $q.when( readFile( file ) ).then( reader => {
        const data = new Uint8Array( reader.result );
        const wb = xlsx.read( data, { type: 'array' } );

        const manifest = new Manifest();
        for( const [name, data] of Object.entries(wb.Sheets) ) {
          const sheetOpts = {
            manifest: manifest,
            name: name,
            data: data,
            noHeaderRow: noHeaderRow || false,
            skipFirstRows: skipFirstRows || 0,
            standardColumnNames: __STANDARD_MANIFEST_COLUMNS__,
            standardBarcodeColumnName: __STANDARD_MANIFEST_BARCODE_COLUMN__,
          };
          manifest.addSheet( new Sheet(sheetOpts) );
        }

        return manifest;
      } );

    }

    function download( { filename, manifest } ) {

      ManifestFileOptionsModal.launch(
        // modal data
        {
          filename,
          sheetNames: manifest.sheets.map( s => ( { old: s.name, new: s.name } ) )
        },
        // callback upon modal closing
        ( manifestOptions ) => {
          if(!manifestOptions) {
            return;
          }
          for(const sheetName of manifestOptions.sheetNames) {
            if(sheetName.old!=sheetName.new) {
              manifest.renameSheet(sheetName.old, sheetName.new);
            }
          }
    
          const wb = manifest.createExcelWorkbook();
          xlsx.writeFile( wb, manifestOptions.filename );
    
        }
    
      );

    }

  }

]);
