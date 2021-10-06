import angular from 'angular';


/******************* Confirmation Modal service ******************************/
angular.module('myApp').factory( 'ConfirmationModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( message ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_confirmation_modal.html',
        size: 'lg',

        resolve: {
          message: function () {
            return JSON.parse( JSON.stringify( message ) ); // deep clone
          }
        },

        controller: [ 'message', function( message ){

          const vm = this;
          vm.message = message;

        }],
        controllerAs: '$ctrl'

      });

      return modalInstance.result;
    }

  };

}]);
