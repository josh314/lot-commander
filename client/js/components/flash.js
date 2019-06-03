import angular from 'angular';

/******************* Flash Message controller *******************************/
angular.module('myApp').controller('FlashCtrl', ['$scope', function($scope) {
  $scope.isHidden = false;
  $scope.closeFlash = function () {
    $scope.isHidden = true;
  };
}]);

