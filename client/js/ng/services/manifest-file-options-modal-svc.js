import angular from 'angular';


/******************* Manifest File Options Modal service ******************************/
angular.module('myApp').factory( 'ManifestFileOptionsModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( { filename, sheetNames }, ctrlFn, dismissFn ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_manifest_file_options_modal.html',
        size: 'lg',
        backdrop: 'static',

        resolve: {
          options: function () {
            return {
              filename,
              sheetNames
            };
          }
        },

        controller: [ 'options', function( options ){

          const vm = this;
          vm.manifestOptions = options;

        }],
        controllerAs: '$ctrl'

      });

      modalInstance.result.then(ctrlFn || function(){}, dismissFn || function(){});
    }

  };
}]);