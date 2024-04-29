import angular from 'angular';

import * as path from 'path';

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
} from '../../manifest-constants';
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
angular.module('myApp').factory( 'ManifestFileHandlerSvc', [

  '$q',
  '$uibModal',
  'ModalSvc',

  function(

    $q,
    $uibModal,
    ModalSvc,

  ) {

    let _activeManifest = null;
    let _activeManifestFilename = null;

    return {
      createFile,
      createFileFromModal,
      downloadFile,
      getActiveManifest,
      getActiveManifestFilename,
      setActiveManifest,
      setActiveManifestFilename,
      isManifestFile,
      launchFileParsingOptionsModal,
      parse,
      parseFile,
      createFileFromExtractByColumnValue,
      downloadFileFromExtractByColumnValue,
      splitStandardManifestByPallet,
      defaultProcessManifest,
      defaultProcessActiveManifest,

      // expose manifest and sheet classes
      Manifest,
      Sheet,
    };

    function getActiveManifest() {
      return _activeManifest;
    }

    function getActiveManifestFilename() {
      return _activeManifestFilename;
    }

    function setActiveManifest( manifest ) {
      return _activeManifest = manifest;
    }

    function setActiveManifestFilename( filename ) {
      return _activeManifestFilename = filename;
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

    function parseFile( file, { noHeaderRow, skipFirstRows, skipLastRows, renameStandardColumns } = {} ) {

      return $q.when( readFile( file ) ).then( reader => {
        return parse( reader.result, file.name, { noHeaderRow, skipFirstRows, skipLastRows, renameStandardColumns } );
      });

    }

    function parse( data, filename, { noHeaderRow, skipFirstRows, skipLastRows, renameStandardColumns } = {} ) {

      const wb = xlsx.read( new Uint8Array( data ) , { type: 'array' } );

      _activeManifest = new Manifest();
      _activeManifestFilename = filename;

      for( const [name, data] of Object.entries(wb.Sheets) ) {
        const sheetOpts = {
          name: name,
          data: data,
          noHeaderRow: noHeaderRow || false,
          skipFirstRows: skipFirstRows || 0,
          skipLastRows: skipLastRows || 0,
          renameStandardColumns
        };
        _activeManifest.addSheet( new Sheet( sheetOpts ) );
      }

      return getActiveManifest();

    }

    function loadFileOptions( filename ) {

      return ModalSvc.manifestFileOptions(
        // modal data
        {
          filename,
          sheetNames: _activeManifest.sheets.map( s => ( { old: s.name, new: s.name } ) )
        },
        // callback upon modal closing
        ( manifestOptions ) => {

          if(!manifestOptions) {
            return;
          }

          for(const sheetName of manifestOptions.sheetNames) {
            if(sheetName.old!=sheetName.new) {
              _activeManifest.renameSheet(sheetName.old, sheetName.new);
            }
          }

          return manifestOptions;
        }

      );

    }

    function downloadFile( filename, isPretty = false ) {

      loadFileOptions( filename ).then( options => {

        if( !options ) {
          return;
        }

        const wb = _activeManifest.createExcelWorkbook( isPretty );
        xlsx.writeFile( wb, options.filename, { compression: true } );

      });

    }

    function createFileFromModal( filename ) {

      return loadFileOptions( filename ).then( options => {

        if( !options ) {
          return;
        }

        const file = createFile( options.filename, _activeManifest );
        return file;

      });

    }

    function createFile( filename, manifest, isPretty = false ) {

      const wb = manifest.createExcelWorkbook( isPretty );
      const wbout = xlsx.write( wb, { type: 'array', compression: true } );
      const file = new File( [ wbout ], filename );

      return file;

    }

    function launchFileParsingOptionsModal( filename, cb ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_parse_manifest_file_options_modal.html',
        size: 'lg',
        backdrop: 'static',
        controller: function () {

          const vm = this;
          vm.filename = filename;
          vm.options = {
            noHeaderRow: false,
            skipFirstRows: 0,
            skipLastRows: 0
          };

        },
        controllerAs: '$ctrl'
      });

      modalInstance.result.then( cb || function(){}, function(){} );
    }

    function loadNewManifestFromExtractByColumnValue( { documentName, data, column, splitValue, sheetName } ) {

      parse( data, documentName, { noHeaderRow: false, skipFirstRows: 0, skipLastRows: 0 } );

      const manifest = getActiveManifest();
      manifest.setActiveSheet( sheetName );

      const newManifest = manifest.extractFromActiveSheetByColumnValue( column, splitValue );
      setActiveManifest( newManifest );

    }

    function createFileFromExtractByColumnValue( { documentName, data, column, splitValue, sheetName } ) {

      loadNewManifestFromExtractByColumnValue( { documentName, data, column, splitValue, sheetName } );
      const newFilename = `${splitValue} - ${documentName}`;
      return createFile( newFilename, getActiveManifest() );

    }

    function downloadFileFromExtractByColumnValue( { documentName, data, column, splitValue, sheetName } ) {

      loadNewManifestFromExtractByColumnValue( { documentName, data, column, splitValue, sheetName } );
      const newFilename = `${splitValue} - ${documentName}`;
      downloadFile( newFilename );

    }

    function splitStandardManifestByPallet( data ) {

      parse( data, 'temp.xlsx', { noHeaderRow: false, skipFirstRows: 0, skipLastRows: 0 } );
      const manifest = getActiveManifest();

      const splitSheets = manifest.splitActiveSheetByColumn( 'Pallet ID' );

      const splitManifests = splitSheets.map( s => {
        const palletName = s.name;
        s.name = 'Data';
        const manifest = new Manifest( [ s ] );

        const res = {
          summary: manifest.standardTotals(),
          file: createFile( `${ palletName }.xlsx`, manifest, true )
        };

        return res;

      });

      return splitManifests;
    }

    function defaultProcessActiveManifest() {

      const manifest = getActiveManifest();

      return defaultProcessManifest( manifest );

    }

    function defaultProcessManifest( manifest ) {

      const columnsMap = {
        'Container': __STANDARD_MANIFEST_PALLET_ID_COLUMN__,
        'Quantity': __STANDARD_MANIFEST_QUANTITY_COLUMN__,
        'UPC #': __STANDARD_MANIFEST_BARCODE_COLUMN__,
        'Description': __STANDARD_MANIFEST_DESCRIPTION_COLUMN__,
        'Extended Retail': __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__,
      };

      const results = {
        sheets: []
      };
      for( let sheet of manifest.sheets ) {
        const _res = {
          sheet,
          success: true,
        };

        sheet.deselectAllColumns();

        for( let [ expectedColumnName, standardColumnName ] of Object.entries( columnsMap ) ) {

          const standardColumn = sheet.renameColumn( expectedColumnName, standardColumnName );

          if( standardColumn ) {
            standardColumn.select();
          }
          else {
            _res.success = false;
            break;
          }

        }

        if( _res.success ) {

          try {
            // normalize UPCs
            sheet.normalizeBarcodeColumn();

            const splitSheets = sheet.splitByColumnValues( __STANDARD_MANIFEST_PALLET_ID_COLUMN__, true );

            _res.pallets = splitSheets.map( s => {
              const palletName = s.name;
              s.name = 'Data';
              const manifest = new Manifest( [ s ] );

              const res = {
                name: palletName,
                manifest,
                summary: manifest.standardTotals(),
                file: createFile( `${ palletName }.xlsx`, manifest, true )
              };

              return res;

            });

          }
          catch(e) {
            console.error(e);
            _res.success = false;
          }

        }

        results.sheets.push( _res );
      }

      results.barcodes = manifest.getUniqueValuesInColumnAllSheets( __STANDARD_MANIFEST_BARCODE_COLUMN__ );

      return results;
    }

  }

]);
