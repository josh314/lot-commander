import angular from 'angular';

/****************** Navigate Service *****************************
* 
* Used for navigating around the app. Mostly just wraps the $state service
*
************/
angular.module('myApp').factory('navigate', [ '$state', function($state){

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

  return {
    listLots: listLots,
    reload: reload,
    scanLot: scanLot,
    viewLot: viewLot,
  };
}]);