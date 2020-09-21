import angular from 'angular';

/******************* Shipment Details Page Controller *************************/
angular.module('myApp').controller('ShipmentDetailsCtrl', [ 'navigate', 'sessionTimeout', 'ShipmentManagerSvc', 'LoggedInUser',
  function( navigate, sessionTimeout, ShipmentManagerSvc, LoggedInUser ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.receiveShipment = () => navigate.receiveShipment( ShipmentManagerSvc.getShipmentId() );

    const init = () => {
      ShipmentManagerSvc.loadShipment().then( shipment => {
        vm.shipment = shipment;
      });
    };

    // init the page
    init();
  }]);
