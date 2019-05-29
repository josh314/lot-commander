import app from '../ng-app';

/******************* Flash Message controller *******************************/
app.controller('FlashCtrl', ['$scope', function($scope) {
  $scope.isHidden = false;
  $scope.closeFlash = function () {
    $scope.isHidden = true;
  };
}]);

