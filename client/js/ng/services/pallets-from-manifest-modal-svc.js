import angular from 'angular';

angular.module('myApp').factory( 'PalletsFromManifestModalSvc', [ '$uibModal', function( $uibModal ) {

  return {
    launch: launch,
  };

  // launches the modal
  function launch( manifestFile, parseOptions, cb ) {

    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_pallets_expected_from_manifest_modal.html',
      size: 'lg',
      backdrop: 'static',
      resolve: {
        manifestFile: function () {
          return manifestFile;
        },
        parseOptions: function() {
          return parseOptions;
        }
      },
      controller: [ 'manifestFile', 'parseOptions', 'ManifestFileHandlerSvc', modalCtrl ],
      controllerAs: '$ctrl'
    });

    modalInstance.result.then( cb || function(){}, function(){} );
  }

  // The modal controller
  function modalCtrl( manifestFile, parseOptions, ManifestFileHandlerSvc ) {

    const vm = this;
    vm.palletsStaged = false;
    vm.columnNames = [];
    vm.palletIdColumn = '';
    vm.palletNames = [];

    vm.stagePallets = stagePallets;
    vm.deletePallet = deletePallet;
    vm.goBack = goBack;
    
    function loadManifest() {

      ManifestFileHandlerSvc.parseFile( manifestFile, parseOptions ).then( manifest => {
        vm.manifest = manifest;
        vm.columnNames = vm.manifest.getColumnNamesAllSheets();
      });

    }

    function stagePallets() {
      vm.palletNames = vm.manifest.getUniqueValuesInColumnAllSheets( vm.palletIdColumn );
      vm.palletsStaged = true;
    }

    function deletePallet( palletName ) {
      const foundIdx = vm.palletNames.findIndex( _pn => _pn === palletName );

      if( foundIdx >= 0 ) {
        vm.palletNames.splice( foundIdx, 1 );
      }

    }

    function goBack() {
      vm.palletNames = [];
      vm.palletsStaged = false;
    }

    function init() {
      loadManifest();
    }
    init();

  }

}]);