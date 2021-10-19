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
      createFile: createFile,
      downloadFile: downloadFile,
      getActiveManifest: getActiveManifest,
      getActiveManifestFilename: getActiveManifestFilename,
      isManifestFile: isManifestFile,
      launchFileParsingOptionsModal: launchFileParsingOptionsModal,
      parse: parse,
      parseFile: parseFile,
    };

    function getActiveManifest() {
      return _activeManifest;
    }

    function getActiveManifestFilename() {
      return _activeManifestFilename;
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
        return parse( reader.result, file.name, { noHeaderRow, skipFirstRows } );
      });

    }

    function parse( data, filename, { noHeaderRow, skipFirstRows } = {} ) {

      const wb = xlsx.read( new Uint8Array( data ) , { type: 'array' } );

      _activeManifest = new Manifest();
      _activeManifestFilename = filename;

      for( const [name, data] of Object.entries(wb.Sheets) ) {
        const sheetOpts = {
          manifest: _activeManifest,
          name: name,
          data: data,
          noHeaderRow: noHeaderRow || false,
          skipFirstRows: skipFirstRows || 0
        };
        _activeManifest.addSheet( new Sheet(sheetOpts) );
      }

      return getActiveManifest();

    }

    function downloadFile( filename ) {

      ManifestFileOptionsModal.launch(
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
    
          const wb = _activeManifest.createExcelWorkbook();
          xlsx.writeFile( wb, manifestOptions.filename, { compression: true } );
    
        }
    
      );

    }

    function createFile( filename, cb ) {

      ManifestFileOptionsModal.launch(
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

          const wb = _activeManifest.createExcelWorkbook();
          const wbout = xlsx.write( wb, { type: 'array', compression: true } );
          const file = new File( [ wbout ], manifestOptions.filename );
          cb( file );

        }

      );

    }

    function launchFileParsingOptionsModal( cb ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_parse_manifest_file_options_modal.html',
        size: 'lg',
        backdrop: 'static',
        controller: function () {

          const vm = this;
          vm.options = {
            noHeaderRow: false,
            skipFirstRows: 0
          };
          
        },
        controllerAs: '$ctrl'
      });

      modalInstance.result.then( cb || function(){}, function(){} );
    }

  }

]);
