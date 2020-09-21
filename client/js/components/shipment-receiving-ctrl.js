import angular from 'angular';

/******************* Shipment Receiving Page Controller *************************/
angular.module('myApp').controller('ShipmentReceivingCtrl', [ 'sessionTimeout', 'ShipmentManagerSvc',
  function(sessionTimeout, ShipmentManagerSvc) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    const init = () => {

      ShipmentManagerSvc.loadShipment().then( resp => vm.shipment = resp.shipment );

    }

    // init the page
    init();
  }
]);
