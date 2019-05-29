import angular from 'angular';

/********************* Run block ****************************************/
angular.module('myApp').run(['$rootScope', '$document', function($rootScope, $document) {
  $rootScope.$on('$stateChangeSuccess', function() {
    $document.prop('body').scrollTop = $document.prop('documentElement').scrollTop = 0;
  });
}]);

