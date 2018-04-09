(function() {
  'use strict';
  /********************* Run block ****************************************/
  angular.module('myApp').run(['$rootScope', '$document', function($rootScope, $document) {
    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
      $document.prop('body').scrollTop = $document.prop('documentElement').scrollTop = 0;
    });
  }]);
})();
