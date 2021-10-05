import angular from 'angular';

/*********************** Footer Directive ***********************/
angular.module('myApp').directive('footerDirective', function(){
  return {
    restrict: 'A',
    replace: true,
    templateUrl: '/partials/_footer.html',
  };
});
