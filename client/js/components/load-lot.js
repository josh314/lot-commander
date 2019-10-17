import angular from 'angular';

/****************** Load lot *****************************/
// Service for loading lot data into the client from the remote DB
angular.module('myApp').service('loadLot', ['$http', '$stateParams', 'lotStore',
  function($http, $stateParams, lotStore){

    return function() {
      return $http.get(`/api/db/get/${$stateParams.lotId}`).then(async (resp)=>{
        const lot = resp.data;
        lotStore.save(lot);
        if(lot.manifestId) {
          await $http.get(`/api/db/manifest/${lot.manifestId}`).then(resp=>{
            lotStore.setInventory(resp.data.manifest.inventory);
          });
        }
        return lot;
      });
    };
  }
]);