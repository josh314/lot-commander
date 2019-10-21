import angular from 'angular';

/******************* Provides utility function for saving lot ***/
angular.module('myApp').factory('saveLot', ['$http', function($http) {
  return function(lot) {
    return $http.post('/api/db/edit-lot/'+lot._id, lot).then( resp => {
      console.log(`updated lot ${lot._id}.`);
      return resp;
    });
  };
}]);

