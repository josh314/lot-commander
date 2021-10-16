import angular from 'angular';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', [ 'ManifestFileHandlerSvc', 'navigate', 'sessionTimeout', 'ShipmentManagerSvc',
  function( ManifestFileHandlerSvc, navigate, sessionTimeout, ShipmentManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.manifest = ManifestFileHandlerSvc.getActiveManifest() || null;
    vm.noFileSelected = false;
    vm.manifestFile = null;
    vm.noHeaderRow = false;
    vm.skipFirstRows = 0;
    vm.shipmentId = ShipmentManagerSvc.getShipmentId();

    vm.loadManifest = loadManifest;
    vm.toggleSelect = column => column.toggleSelect;
    vm.getActiveSheet = () => vm.manifest ? vm.manifest.getActiveSheet(): null;
    vm.setActiveSheet = sheetName => vm.manifest ? vm.manifest.setActiveSheet(sheetName): null;
    vm.addCheckDigitsAllSheets = () => vm.manifest.addCheckDigitsAllSheets();
    vm.deleteSheet = sheet => vm.manifest.deleteSheet(sheet);
    vm.splitActiveSheetByColumn =  column => vm.manifest.splitActiveSheetByColumn( column );
    vm.startManifestDownload = startManifestDownload;
    vm.saveToShipment = saveToShipment;

    //////////

    function loadManifest() {

      if(!vm.manifestFile) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      ManifestFileHandlerSvc.parseFile( vm.manifestFile, { noHeaderRow: vm.noHeaderRow, skipFirstRows: vm.skipFirstRows } ).then( manifest => vm.manifest = manifest );
      
    }


    function startManifestDownload() {

      const fileNameParts = vm.manifestFile.name.split('.');
      fileNameParts.pop();
      const outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');

      ManifestFileHandlerSvc.downloadFile( outputFilename );

    }

    function saveToShipment() {

      if( vm.shipmentId ) {

        // TODO?: get isRestricted status

        const fileNameParts = ManifestFileHandlerSvc.getActiveManifestFilename().split('.');
        fileNameParts.pop();
        const outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');

        ManifestFileHandlerSvc.createFile( outputFilename, function( file ) {

          ShipmentManagerSvc.uploadShipmentDocument( { shipmentId: vm.shipmentId, file, isRestricted: false } ).then( _ => navigate.shipmentDetails( vm.shipmentId ) );

        });

      }

    }

  }
]);