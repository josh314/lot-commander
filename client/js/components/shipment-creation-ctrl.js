import angular from 'angular';

/******************* Shipment Creation Page Controller *************************/
angular.module('myApp').controller('ShipmentCreationCtrl', [ 'navigate', 'sessionTimeout', 'ShipmentManagerSvc',
  function(navigate, sessionTimeout, ShipmentManagerSvc) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.inputs = {
      categoryOptions: [
        "general merchandise",
        "cosmetics",
        "personal care",
        "clothing"
      ],
      pallets: [],
    };

    vm.addPallet = () => vm.inputs.pallets.push({});
    vm.removePallet = ( idx ) => vm.inputs.pallets.splice( idx, 1 );
    vm.createShipment = () => {
      ShipmentManagerSvc.createShipment( shipmentRequest() ).then( result => {
        if( result && result.shipment ) {
          navigate.shipmentDetails( result.shipment._id );
        }
        else {
          //TODO: warning modal
        }
      });
    };

    function shipmentRequest() {

      const shipment = {
        handle: vm.inputs.handle,
        vendor: vm.inputs.vendor,
        category: vm.inputs.category,
        carrier: vm.inputs.carrier,
        arrivalDate: vm.inputs.arrivalDate, // TODO: time zone BS
        pallets: vm.inputs.pallets
      };
    
      return shipment;
    };

  }
]);
