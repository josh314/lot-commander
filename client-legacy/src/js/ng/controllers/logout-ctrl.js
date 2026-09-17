import angular from 'angular';

/*************** Logout Controller **************************/
angular.module('myApp').controller('LogoutCtrl', ['logout', function(logout){
  logout();
}]);

