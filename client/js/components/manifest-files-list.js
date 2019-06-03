import angular from 'angular';

/******************* Manifest Files Controller *************************/
angular.module('myApp').controller('ManifestFilesListCtrl', ['$scope', '$http', 'sessionTimeout', function($scope, $http, sessionTimeout) {
  sessionTimeout.timeoutExpired();
  $scope.files = null;
  $http.get('/api/manifest-files/list').then(resp=>{
    $scope.files = resp.data.files;
  });
}]);
