import angular from 'angular';

angular.module('myApp').controller( 'PalletsFromManifestModalCtrl', [

  'manifestFile',
  'parseOptions',
  'ManifestFileHandlerSvc',

  function(

    manifestFile,
    parseOptions,
    ManifestFileHandlerSvc,

  ) {

    const vm = this;
    vm.manifestFilename = manifestFile.name;
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
        if( vm.columnNames.includes( 'Container' ) ) {
          vm.palletIdColumn = 'Container';
        }
      });

    }

    function stagePallets() {

      if( vm.palletIdColumn ) {

        vm.palletNames = vm.manifest.getUniqueValuesInColumnAllSheets( vm.palletIdColumn );
        vm.palletsStaged = true;

      }

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

]);