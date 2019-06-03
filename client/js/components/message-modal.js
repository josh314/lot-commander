import angular from 'angular';


/******************* Message Modal service ******************************/
angular.module('myApp').factory('messageModal', ['$uibModal', function($uibModal){
  return {
    launch: function(message, ctrlFn, dismissFn) {
      
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/_message_modal.html',
        size: 'lg',
        controller: 'MessageModalController',
        resolve: {
          message: function () {
            return message;
          }
        },
      });

      modalInstance.result.then(ctrlFn || function(){}, dismissFn || function(){});
    }
  };
}]);

/***************** Modal Controller ************************/
angular.module('myApp').controller('MessageModalController', [ '$scope', 'message', function($scope, message){
  $scope.message = JSON.parse(JSON.stringify(message));
}]);
