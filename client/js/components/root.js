import angular from 'angular';

/******************* Angular App Root Controller ****************************/
angular.module('myApp').controller('RootCtrl', ['sessionTimeout', function(sessionTimeout) {
  sessionTimeout.init();
}]);

