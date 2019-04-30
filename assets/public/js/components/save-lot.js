(function() {
  'use strict';
  /************************************************************************
  ************************ Angular app ************************************
  *************************************************************************/
  var app = angular.module('myApp');

  /******************* Provides utility function for saving lot ***/
  app.factory('saveLot', ['$http', function($http) {
    return function(lot) {
      return $http.post('/api/db/edit-lot/'+lot._id, lot).then(resp=>{
         console.log(`updated lot ${lot._id}.`)
      });
    };
  }]);
})();
