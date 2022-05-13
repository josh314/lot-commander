import angular from 'angular';


/******************* Message Modal service ******************************/
angular.module('myApp').factory( 'WaitingModalSvc', [ '$uibModal', function( $uibModal ) {

  return {

    launch: function( { waitFor, delay } ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_waiting_modal.html',
        size: 'lg',
        controller: [ '$scope','$timeout', function( $scope, $timeout ){

          if( waitFor && delay ) {

            waitFor.then( result => {

              $timeout( delay ).then( () => $scope.$close( result ) );

            } );

          }
          else if( waitFor ) {

            waitFor.then( result => $scope.$close( result ) );

          }
          else if( delay ) {

            $timeout( delay ).then( () => $scope.$close() );

          }

        }],
        controllerAs: '$ctrl'
      });

      return modalInstance.result;
    }

  };

}]);