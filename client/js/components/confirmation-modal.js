import angular from 'angular';


/******************* Message Modal service ******************************/
angular.module('myApp').factory('ConfirmationModal', ['$uibModal', function($uibModal){
  return {
    launch: function( message ) {
      
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_confirmation_modal.html',
        size: 'lg',
        controller: 'ConfirmationModalCtrl as ctrl',
        resolve: {
          message: function () {
            return message;
          }
        },
      });

      return modalInstance.result;
    }
  };
}]);

/***************** Modal Controller ************************/
angular.module('myApp').controller('ConfirmationModalCtrl', [ 'message', function( message ){

  const vm = this;
  vm.message = JSON.parse( JSON.stringify( message ) );

}]);
