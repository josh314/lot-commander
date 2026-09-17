import angular from 'angular';

/******************* Service Locator ***/
angular.module('myApp').service('ServiceLocator', [ '$injector', function( $injector ) {

  this.get = function(serviceName) {
    return $injector.get(serviceName);
  };

}]);