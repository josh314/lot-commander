// Vendor
import angular from "angular";

/********************* Config & Routes *********************************/
angular.module('myApp').config(
  ['$locationProvider', '$stateProvider', '$urlRouterProvider', '$urlMatcherFactoryProvider', 'stateConfigData',
    function($locationProvider, $stateProvider, $urlRouterProvider, $urlMatcherFactoryProvider, stateConfigData) {
      $locationProvider.html5Mode({enabled: true});
      $urlRouterProvider.otherwise('/');
      $urlMatcherFactoryProvider.strictMode(false);

      // Create an array of state objects to be registered with $stateProvider
      var states = [];
      stateConfigData.forEach(function(state) {
        states.push({name: state.name, abstract: state.abstract, url: state.url, templateUrl: state.templateUrl, controller:state.controller});
      });
      angular.forEach(states, function(state) { $stateProvider.state(state); });
}]);
