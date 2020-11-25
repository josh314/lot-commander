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
angular.module('myApp').controller('ShipmentCreationCtrl', [ 'messageModal', 'navigate', 'palletCategories', 'sessionTimeout', 'ShipmentManagerSvc',
  function(messageModal, navigate, palletCategories, sessionTimeout, ShipmentManagerSvc) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.inputs = {
      categoryOptions: [ "" ].concat( palletCategories ),
      pallets: [],
      numAnonymousPallet: ''
    };
    vm.validator = new ShipmentValidator();

    vm.refreshValidator = refreshValidator;
    vm.setPalletCategories = ( ) => vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );
    vm.clearPalletUnits = ( ) => vm.inputs.pallets.forEach( p => delete p.units );
    vm.addPallet = () => vm.inputs.pallets.push({ category: vm.inputs.category });
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

      const anonPallets = Array( numAnonPalletsToAdd ).fill( null ).map( ( _, idx ) => ({ handle: handleFn( idx ), category: vm.inputs.category, isAnonymous: true }) );

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

  }
]);
