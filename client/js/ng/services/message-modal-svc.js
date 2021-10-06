import angular from 'angular';


/******************* Message Modal service ******************************/
angular.module('myApp').factory( 'messageModal', [ '$uibModal', function( $uibModal ) {

  return {

    launch: function( message, ctrlFn, dismissFn ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_message_modal.html',
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

      modalInstance.result.then(ctrlFn || function(){}, dismissFn || function(){});
    }

  };

}]);