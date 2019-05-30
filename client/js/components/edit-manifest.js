import app from '../ng-app';


/******************* Scanning Page Controller *************************/
app.controller('EditManifestCtrl', ['$scope', '$state', 'lotStore', 'saveManifest', 'sessionTimeout', function($scope, $state, lotStore, saveManifest, sessionTimeout) {
  sessionTimeout.timeoutExpired();
  $scope.lot = lotStore;
  $scope.saveManifest = () => saveManifest().then(()=>{
    // $state.go('main.home');
    $state.go('main.lots.view', {lotId: lotStore._id});
  });

}]);
