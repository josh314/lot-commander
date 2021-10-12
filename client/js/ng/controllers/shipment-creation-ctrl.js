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
  function( messageModal, navigate, palletCategories, PalletsFromManifestModalSvc, sessionTimeout, ShipmentManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.inputs = {
      categoryOptions: [ "" ].concat( palletCategories ),
      manifest: {
        file: null,
        isRestricted: false
      },
      pallets: [],
      numAnonymousPallet: ''
    };
    vm.validator = new ShipmentValidator();

    vm.refreshValidator = refreshValidator;
    vm.setPalletCategories = ( ) => vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );
    vm.clearPalletUnits = ( ) => vm.inputs.pallets.forEach( p => delete p.units );
    vm.addPallet = () => addPallet({ category: vm.inputs.category });
    vm.removePallet = removePallet;
    vm.addAnonymousPallets = addAnonymousPallets;
    vm.importPalletsFromManifest = importPalletsFromManifest;
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
            return result.shipment;
          }
          else {
            throw new Error('Server error.');
          }
        })
          .then( async (shipment) => {

            if( vm.inputs.manifest.file ) {

              await ShipmentManagerSvc.uploadShipmentDocument( {
                shipmentId: shipment._id,
                file: vm.inputs.manifest.file,
                isRestricted: vm.inputs.manifest.isRestricted || false
              } );

            }

            return shipment;
          })
          .then( shipment => navigate.shipmentDetails( shipment._id ) )
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

    function importPalletsFromManifest() {

      PalletsFromManifestModalSvc.launch( vm.inputs.manifest.file, palletNames => palletNames.forEach( p => addPallet( { handle: p, category: vm.inputs.category } ) ));

    }

  }

]);