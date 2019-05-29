import app from '../ng-app';


/******************* Message Modal service ******************************/
app.factory('messageModal', ['$uibModal', function($uibModal){
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
app.controller('MessageModalController', [ '$scope', 'message', function($scope, message){
  $scope.message = JSON.parse(JSON.stringify(message));
}]);
