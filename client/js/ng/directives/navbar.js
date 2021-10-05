import angular from 'angular';

/*********************** Navbar Directive ***********************/
angular.module('myApp').directive('navbarDirective', function(){
  return {
    restrict: 'A',
    replace: true,
    templateUrl: '/partials/_navbar.html',
  };
});
