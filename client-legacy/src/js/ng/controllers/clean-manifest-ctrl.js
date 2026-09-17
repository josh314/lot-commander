import angular from 'angular';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller( 'CleanManifestCtrl', [

  'ManifestFileHandlerSvc',
  'ManifestSalePriceColumnModalSvc',
  'ModalSvc',
  'navigate',
  'ShipmentManagerSvc',

  function(

    ManifestFileHandlerSvc,
    ManifestSalePriceColumnModalSvc,
    ModalSvc,
    navigate,
    ShipmentManagerSvc,

  ) {

    const vm = this;

    vm.noFileSelected = false;
    vm.manifestFile = null;
    vm.noHeaderRow = false;
    vm.skipFirstRows = 0;
    vm.skipLastRows = 0;
    vm.shipmentId = ShipmentManagerSvc.getShipmentId();

    vm.loadManifestFromSelectedFile = loadManifestFromSelectedFile;
    vm.removeRow = removeRow;
    vm.toggleSelect = column => column.toggleSelect;
    vm.getActiveSheet = () => vm.manifest ? vm.manifest.getActiveSheet(): null;
    vm.setActiveSheet = sheetName => vm.manifest ? vm.manifest.setActiveSheet(sheetName): null;
    vm.addCheckDigitsAllSheets = () => vm.manifest.addCheckDigitsAllSheets();
    vm.deleteSheet = sheet => vm.manifest.deleteSheet(sheet);
    vm.splitActiveSheetByColumn =  column => vm.manifest.splitActiveSheetByColumn( column );
    vm.createSalePriceColumn = createSalePriceColumn;
    vm.startManifestDownload = startManifestDownload;
    vm.saveToShipment = saveToShipment;

    vm.mergeSheets = () => {

      const sheetnames = vm.manifest.sheets.map( s => s.name );

      ModalSvc.mergeSheetsOptions( sheetnames ).then( ( { mergedSheetName, sheetColumnName, sheetnameTransformMap } ) => {
        vm.manifest.mergeAllSheets( { mergedSheetName, sheetColumnName, sheetnameTransformMap } );
      } );

    };


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

      const parseOpts = {
        noHeaderRow: vm.noHeaderRow,
        skipFirstRows: vm.skipFirstRows,
        skipLastRows: vm.skipLastRows,
        renameStandardColumns: true
      };

      ManifestFileHandlerSvc.parseFile( vm.manifestFile, parseOpts ).then( loadActiveManifest );

    }

    function loadActiveManifest() {
      const manifest = ManifestFileHandlerSvc.getActiveManifest();
      if( manifest ) {
        manifest.deselectAllColumnsAllSheets();
        vm.manifest = manifest;
      }
    }

    async function removeRow( sheet, idx ) {

      const msg = `Remove row #${idx}? This can't be undone.`;

      const isConfirmed = await ModalSvc.confirm({
        header: 'Remove Row',
        body: msg
      });

      if( !isConfirmed ) {
        return;
      }
      else if( vm.manifest ) {
        vm.manifest.removeRow( sheet, idx );
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