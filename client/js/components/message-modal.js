import angular from 'angular';


/******************* Message Modal service ******************************/
angular.module('myApp').factory('messageModal', ['$uibModal', function($uibModal){
  return {
    launch: function(message, ctrlFn, dismissFn) {
      
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_message_modal.html',
        size: 'lg',
        controller: 'MessageModalCtrl as ctrl',
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
angular.module('myApp').controller('MessageModalCtrl', [ 'message', function( message ){

  const vm = this;
  vm.message = JSON.parse( JSON.stringify( message ) );

}]);
