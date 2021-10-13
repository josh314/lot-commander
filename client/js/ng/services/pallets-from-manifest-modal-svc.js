import angular from 'angular';

angular.module('myApp').factory( 'PalletsFromManifestModalSvc', [ '$uibModal', function( $uibModal ) {

  return {
    launch: launch,
  };

  // launches the modal
  function launch( manifestFile, cb ) {

    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_pallets_expected_from_manifest_modal.html',
      size: 'lg',
      backdrop: 'static',
      resolve: {
        manifestFile: function () {
          return manifestFile;
        }
      },
      controller: [ 'manifestFile', 'ManifestFileHandler', modalCtrl ],
      controllerAs: '$ctrl'
    });

    modalInstance.result.then( cb || function(){}, function(){} );
  }

  // The modal controller
  function modalCtrl( manifestFile, ManifestFileHandler ) {

    const vm = this;
    vm.noHeaderRow = false;
    vm.skipFirstRows = 0;
    vm.palletsStaged = false;
    vm.columnNames = [];
    vm.palletIdColumn = '';
    vm.palletNames = [];

    vm.loadManifest = loadManifest;
    vm.stagePallets = stagePallets;
    vm.deletePallet = deletePallet;
    vm.goBack = goBack;
    
    function loadManifest() {

      ManifestFileHandler.load( manifestFile, { noHeaderRow: vm.noHeaderRow, skipFirstRows: vm.skipFirstRows } ).then( manifest => {
        vm.manifest = manifest;
        vm.manifestLoaded = true;
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

      if( vm.manifestLoaded && !vm.palletsStaged ) {
        unloadManifest();
      }
      else if ( vm.palletsStaged ) {
        unstagePallets();
      }

    }

    function unloadManifest() {
      delete vm.manifest;
      vm.manifestLoaded = false;
      vm.columnNames = [];
    }

    function unstagePallets() {
      vm.palletNames = [];
      vm.palletsStaged = false;
    }

  }

}]);