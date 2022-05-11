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
angular.module('myApp').factory( 'ManifestFileHandlerSvc', [ '$q', '$uibModal', 'ManifestFileOptionsModal',

  function( $q, $uibModal, ManifestFileOptionsModal ) {

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

    function parseFile( file, { noHeaderRow, skipFirstRows, renameStandardColumns } = {} ) {

      return $q.when( readFile( file ) ).then( reader => {
        return parse( reader.result, file.name, { noHeaderRow, skipFirstRows, renameStandardColumns } );
      });

    }

    function parse( data, filename, { noHeaderRow, skipFirstRows, renameStandardColumns } = {} ) {

      const wb = xlsx.read( new Uint8Array( data ) , { type: 'array' } );

      _activeManifest = new Manifest();
      _activeManifestFilename = filename;

      for( const [name, data] of Object.entries(wb.Sheets) ) {
        const sheetOpts = {
          name: name,
          data: data,
          noHeaderRow: noHeaderRow || false,
          skipFirstRows: skipFirstRows || 0,
          renameStandardColumns
        };
        _activeManifest.addSheet( new Sheet( sheetOpts ) );
      }

      return getActiveManifest();

    }

    function loadFileOptions( filename ) {

      return ManifestFileOptionsModal.launch(
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

    function downloadFile( filename ) {

      loadFileOptions( filename ).then( options => {

        if( !options ) {
          return;
        }

        const wb = _activeManifest.createExcelWorkbook();
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

    function createFile( filename, manifest ) {

      const wb = manifest.createExcelWorkbook();
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
            skipFirstRows: 0
          };
          
        },
        controllerAs: '$ctrl'
      });

      modalInstance.result.then( cb || function(){}, function(){} );
    }

    function loadNewManifestFromExtractByColumnValue( { documentName, data, column, splitValue, sheetName } ) {

      parse( data, documentName, { noHeaderRow: false, skipFirstRows: 0 } );

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

      parse( data, 'temp.xlsx', { noHeaderRow: false, skipFirstRows: 0 } );
      const manifest = getActiveManifest();

      const splitSheets = manifest.splitActiveSheetByColumn( 'Pallet ID' );

      const splitManifests = splitSheets.map( s => {
        const manifest = new Manifest( [ s ] );
        return createFile( `${manifest.activeSheet.name}.xlsx`, manifest );
      });

      return splitManifests;
    }

  }

]);
