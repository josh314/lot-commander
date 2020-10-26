import angular from 'angular';

/****************** Navigate Service *****************************
* 
* Used for navigating around the app. Mostly just wraps the $state service
*
************/
angular.module('myApp').factory('navigate', [ '$state', function($state){

  const home = () => $state.go('main.home');

  const viewLot = (lotId) => {
    $state.go('main.lots.view', {lotId: lotId});
  };

  const scanLot = (lotId) => {
    $state.go('main.lots.scan', {lotId: lotId});
  };

  const listLots = () => {
    $state.go('main.lots.list');
  };

  const reload = () => {
    $state.reload();
  };

  const shipmentCreation = () => $state.go('main.receiving.shipment-creation');

  const shipmentDetails = ( shipmentId ) => $state.go('main.receiving.shipment-details', { shipmentId: shipmentId } );

  const shipmentList = () => $state.go('main.receiving.shipment-list');

  const shipmentReceiving = ( shipmentId ) => $state.go('main.receiving.shipment-receiving', { shipmentId: shipmentId } );

  return {
    home: home,
    listLots: listLots,
    reload: reload,
    shipmentCreation: shipmentCreation,
    shipmentDetails: shipmentDetails,
    shipmentList: shipmentList,
    shipmentReceiving: shipmentReceiving,
    scanLot: scanLot,
    viewLot: viewLot,
  };
}]);