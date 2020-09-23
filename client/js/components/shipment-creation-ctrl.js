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
angular.module('myApp').controller('ShipmentCreationCtrl', [ 'messageModal', 'navigate', 'sessionTimeout', 'ShipmentManagerSvc',
  function(messageModal, navigate, sessionTimeout, ShipmentManagerSvc) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.inputs = {
      categoryOptions: [
        "",
        "general merchandise",
        "cosmetics",
        "personal care",
        "clothing"
      ],
      pallets: [],
    };
    vm.validator = new ShipmentValidator();
    const refreshValidator = () => vm.validator = new ShipmentValidator( vm.inputs );

    vm.setPalletCategories = ( ) => vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );

    vm.addPallet = () => vm.inputs.pallets.push({ category: vm.inputs.category });

    vm.removePallet = ( idx ) => {
      vm.inputs.pallets.splice( idx, 1 );
      if( vm.validator.pallets ) {
        vm.validator.pallets.splice( idx, 1 );
      }
    };

    vm.createShipment = () => {

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

    };

    function shipmentRequest() {

      const shipment = Object.assign( {}, vm.inputs );
      
      // TODO: date transformations? timezone stuff?

      delete shipment.categoryOptions;

      return shipment;
    }

  }
]);
