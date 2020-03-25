import angular from 'angular';

/******************* Request File Modal Service *************************/
angular.module('myApp').factory('requestFileModal', ['$state', '$http', '$uibModal', function($state, $http, $uibModal) {
  return {
    launch: function(lot) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_request_file_modal.html',
        size: 'lg',
        controller: 'RequestFileModalController',
        resolve: {
          lot: function () {
            return lot;
          }
        },
      });

      modalInstance.result.then(function(fileRequest) {
        if(!fileRequest) {
          return;
        }
        // const body = {
        //  manifestId: lot.manifestId,
        // }
        const body = {
          lotId: lot._id,
        };
        if(fileRequest.format==='Bstock') {
          body.bstock = {
            Category: fileRequest.category,
            Condition: fileRequest.condition,
            Packaging: fileRequest.packaging,
          };
        }
        $http.post(`/api/manifest-files/generate`, body).then(()=>{
          //TODO: some sort of acknoledgement of success/failure
          $state.reload();
        });
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }
  };
}]);

/***************** Modal Controller ************************/
angular.module('myApp').controller('RequestFileModalController', [ '$scope', 'lot', 'bstockConstants',
  function($scope, lot, bstockConstants){
    $scope.lot = JSON.parse(JSON.stringify(lot));
    $scope.bstockConstants = bstockConstants;
  }
]);
