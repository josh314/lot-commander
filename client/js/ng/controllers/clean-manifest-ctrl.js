import angular from 'angular';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('CleanManifestCtrl', [ 'ManifestFileHandlerSvc', 'ManifestSalePriceColumnModalSvc', 'navigate', 'sessionTimeout', 'ShipmentManagerSvc',
  function( ManifestFileHandlerSvc, ManifestSalePriceColumnModalSvc, navigate, sessionTimeout, ShipmentManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.noFileSelected = false;
    vm.manifestFile = null;
    vm.noHeaderRow = false;
    vm.skipFirstRows = 0;
    vm.shipmentId = ShipmentManagerSvc.getShipmentId();

    vm.loadManifestFromSelectedFile = loadManifestFromSelectedFile;
    vm.toggleSelect = column => column.toggleSelect;
    vm.getActiveSheet = () => vm.manifest ? vm.manifest.getActiveSheet(): null;
    vm.setActiveSheet = sheetName => vm.manifest ? vm.manifest.setActiveSheet(sheetName): null;
    vm.addCheckDigitsAllSheets = () => vm.manifest.addCheckDigitsAllSheets();
    vm.deleteSheet = sheet => vm.manifest.deleteSheet(sheet);
    vm.splitActiveSheetByColumn =  column => vm.manifest.splitActiveSheetByColumn( column );
    vm.createSalePriceColumn = createSalePriceColumn;
    vm.startManifestDownload = startManifestDownload;
    vm.saveToShipment = saveToShipment;


    // Initialization
    loadActiveManifest();

    /***************************************************
     * Controller methods
     *
     *************/

    function loadManifestFromSelectedFile() {

      if(!vm.manifestFile) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      ManifestFileHandlerSvc.parseFile( vm.manifestFile, { noHeaderRow: vm.noHeaderRow, skipFirstRows: vm.skipFirstRows } ).then( loadActiveManifest );
      
    }

    function loadActiveManifest() {
      const manifest = ManifestFileHandlerSvc.getActiveManifest();
      if( manifest ) {
        manifest.deselectAllColumnsAllSheets();
        vm.manifest = manifest;
      }
    }

    function createSalePriceColumn() {
      ManifestSalePriceColumnModalSvc.launch( vm.manifest );
    }

    function startManifestDownload() {

      const fileNameParts = ManifestFileHandlerSvc.getActiveManifestFilename().split('.');
      fileNameParts.pop();
      const outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');

      ManifestFileHandlerSvc.downloadFile( outputFilename );

    }

    function saveToShipment() {

      if( vm.shipmentId ) {

        const fileNameParts = ManifestFileHandlerSvc.getActiveManifestFilename().split('.');
        fileNameParts.pop();
        const outputFilename = fileNameParts.concat( [ 'cleaned', 'xlsx' ] ).join('.');

        ManifestFileHandlerSvc.createFileFromModal( outputFilename ).then( file => {

          ShipmentManagerSvc.uploadShipmentDocument( { shipmentId: vm.shipmentId, file, documentType: 'manifest', isRestricted: true } ).then( _ => navigate.shipmentDetails( vm.shipmentId ) );

        });

      }

    }

  }
]);

angular.module('myApp').factory( 'ManifestSalePriceColumnModalSvc', [ '$uibModal', function( $uibModal ) {

  return {
    launch: launch,
  };

  function launch( manifest ) {
    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_manifest_sale_price_column_modal.html',
      size: 'lg',
      backdrop: 'static',

      resolve: {
        manifest: function () {
          return manifest;
        }
      },

      controller: [ '$scope', 'manifest', function( $scope, manifest ) {

        const vm = this;
        vm.discountPct = 50;
        vm.priceType = '';
        vm.priceTypeOptions = [ 'unit', 'total' ];
        vm.cannotComputeSalePrices = false;

        vm.checkIfCanComputeSalePrices = () => {

          vm.cannotComputeSalePrices = manifest.sheets.every( _s => !_s.canComputeSalePriceColumn( vm.priceType ) );

        };

        vm.createSalePriceColumn = function() {

          const discountFactor = ( vm.discountPct ) / 100;

          if( vm.priceType !== 'unit' && vm.priceType !== 'total' ) {
            return;
          }

          manifest.createSalePriceColumnFromRetailPrices( discountFactor, vm.priceType );
          $scope.$close();
        };

      }],
      controllerAs: '$ctrl'

    });

    return modalInstance.result.then( () => {}, () => {} );
  }

}]);