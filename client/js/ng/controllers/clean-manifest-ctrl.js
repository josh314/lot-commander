import angular from 'angular';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', ['ManifestFileHandlerSvc', 'sessionTimeout',
  function( ManifestFileHandlerSvc, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.manifest = ManifestFileHandlerSvc.get() || null;
    vm.noFileSelected = false;
    vm.manifestFile = null;
    vm.noHeaderRow = false;
    vm.skipFirstRows = 0;

    vm.loadManifest = loadManifest;
    vm.toggleSelect = column => column.toggleSelect;
    vm.getActiveSheet = () => vm.manifest ? vm.manifest.getActiveSheet(): null;
    vm.setActiveSheet = sheetName => vm.manifest ? vm.manifest.setActiveSheet(sheetName): null;
    vm.addCheckDigitsAllSheets = () => vm.manifest.addCheckDigitsAllSheets();
    vm.deleteSheet = sheet => vm.manifest.deleteSheet(sheet);
    vm.splitActiveSheetByColumn =  column => vm.manifest.splitActiveSheetByColumn( column );
    vm.startManifestDownload = startManifestDownload;

    //////////

    function loadManifest() {

      if(!vm.manifestFile) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      ManifestFileHandlerSvc.parse( vm.manifestFile, { noHeaderRow: vm.noHeaderRow, skipFirstRows: vm.skipFirstRows } ).then( manifest => vm.manifest = manifest );
      
    }


    function startManifestDownload() {

      const fileNameParts = vm.manifestFile.name.split('.');
      fileNameParts.pop();
      const outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');

      ManifestFileHandlerSvc.download( outputFilename );

    }

  }
]);