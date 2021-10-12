import angular from 'angular';


class ShipmentValidator {
  constructor( inputs ) {
    if( inputs ) {
      this.invalidHandle = !inputs.handle;
      this.pallets = inputs.pallets.map( p => ({ invalidHandle: !p.handle }) );
    }
    else {
      this.clean = true;
    }
  }

  arePalletsValid() {
    const isPalletValid = p => !p.invalidHandle;

    return this.pallets.every( isPalletValid );
  }

  isValid() {
    return this.clean || ( !this.invalidHandle && this.arePalletsValid() );
  }
}

/******************* Shipment Creation Page Controller *************************/
angular.module('myApp').controller('ShipmentCreationCtrl', [ 'messageModal', 'navigate', 'palletCategories', 'PalletsFromManifestModalSvc', 'sessionTimeout', 'ShipmentManagerSvc',
  function( messageModal, navigate, palletCategories,  PalletsFromManifestModalSvc, sessionTimeout, ShipmentManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.inputs = {
      categoryOptions: [ "" ].concat( palletCategories ),
      pallets: [],
      numAnonymousPallet: ''
    };
    vm.validator = new ShipmentValidator();

    vm.refreshValidator = refreshValidator;
    vm.importManifest = importManifest;
    vm.setPalletCategories = ( ) => vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );
    vm.clearPalletUnits = ( ) => vm.inputs.pallets.forEach( p => delete p.units );
    vm.addPallet = () => addPallet({ category: vm.inputs.category });
    vm.removePallet = removePallet;
    vm.addAnonymousPallets = addAnonymousPallets;
    vm.createShipment = createShipment;


    function removePallet( idx ) {
      vm.inputs.pallets.splice( idx, 1 );
      if( vm.validator.pallets ) {
        vm.validator.pallets.splice( idx, 1 );
      }
    }

    function refreshValidator() {
      vm.validator = new ShipmentValidator( vm.inputs );
    }

    function createShipment() {

      refreshValidator();

      if( vm.validator.isValid() ) {
        ShipmentManagerSvc.createShipment( shipmentRequest() ).then( result => {

          if( result && result.shipment ) {
            navigate.shipmentDetails( result.shipment._id );
          }
          else {
            throw new Error('Server error.');
          }
        })
          .catch( e => {
            messageModal.launch({header: 'Error', body: e.message, type: 'error'});
          });

      }

    }

    function addPallet( data ) {
      vm.inputs.pallets.push( data );
    }

    function addAnonymousPallets() {

      const numAnonPalletsToAdd = parseInt( vm.inputs.numAnonymousPallet );

      if( !numAnonPalletsToAdd ) {
        // TODO: warn that num anon pallets not set
        return;
      }

      if( !vm.inputs.handle ) {
        vm.validator.invalidHandle = true;
        return;
      }
      else {
        refreshValidator();
      }

      const currentNumAnonPallet = vm.inputs.pallets.reduce( (num, p) => num + ( p.isAnonymous ? 1 : 0 ) , 0 );

      const handleFn = ( idx ) => ShipmentManagerSvc.buildAnonymousPalletHandle( vm.inputs.handle, currentNumAnonPallet + 1 + idx );

      const anonPallets = [];
      for( let idx=0; idx<numAnonPalletsToAdd; idx++) {
        addPallet( { handle: handleFn( idx ), category: vm.inputs.category, isAnonymous: true } );
      }

      vm.inputs.pallets = vm.inputs.pallets.concat(anonPallets);

    }


    function shipmentRequest() {

      if( vm.inputs.totalUnits ) {
        vm.clearPalletUnits();
      }

      const shipment = Object.assign( {}, vm.inputs );
      
      // TODO: date transformations? timezone stuff?

      delete shipment.categoryOptions;

      return shipment;
    }

    function importManifest() {
      PalletsFromManifestModalSvc.launch( palletNames => palletNames.forEach( p => addPallet( { handle: p, category: vm.inputs.category } ) ));
    }

  }
]);

angular.module('myApp').factory( 'PalletsFromManifestModalSvc', [ '$uibModal', function( $uibModal ) {

  return {
    launch: launch,
  };

  // launches the modal
  function launch( cb ) {

    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_pallets_expected_from_manifest_modal.html',
      size: 'lg',
      controller: [ 'ManifestFileHandler', modalCtrl ],
      controllerAs: '$ctrl'
    });

    modalInstance.result.then( cb || function(){}, function(){} );
  }

  // The modal controller
  function modalCtrl( ManifestFileHandler ) {

    const vm = this;
    vm.manifest = null;
    vm.noFileSelected = false;
    vm.manifestFile = null;
    vm.noHeaderRow = false;
    vm.skipFirstRows = 0;
    vm.manifestLoaded = false;
    vm.palletsStaged = false;
    vm.loadManifest = loadManifest;
    vm.previewPallets = previewPallets;

    function loadManifest() {

      if(!vm.manifestFile) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      ManifestFileHandler.load( vm.manifestFile, { noHeaderRow: vm.noHeaderRow, skipFirstRows: vm.skipFirstRows } ).then( manifest => {
        vm.manifest = manifest;
        vm.manifestLoaded = true;
        startPalletConfiguration();
      });

    }

    function startPalletConfiguration() {
      vm.palletNames = [];
      vm.columnNames = vm.manifest.getColumnNamesAllSheets();
    }

    function previewPallets() {
      vm.palletNames = vm.manifest.getUniqueValuesInColumnAllSheets( vm.palletIdColumn );
      vm.palletsStaged = true;
    }

  }

}]);