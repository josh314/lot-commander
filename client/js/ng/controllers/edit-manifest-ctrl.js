import angular from 'angular';


/******************* Edit Manifest Page Controller *************************/
angular.module('myApp').controller('EditManifestCtrl', [

  'LotSvc',
  'navigate',
  'sessionTimeout',

  function(

    LotSvc,
    navigate,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      Object.assign(
        vm,
        {
          addInventoryItem,
          deleteInventoryItem,
          saveManifest,
        }
      );

      LotSvc.load( )
        .then( lot => {

          vm.lot = lot;

        } );

    }

    function deleteInventoryItem( barcode ) {
      vm.lot.deleteProduct( barcode );
    }

    function addInventoryItem() {
      vm.lot.inventory.push({});
    }

    async function saveManifest() {
      await vm.lot.saveManifest();
      navigate.viewLot( vm.lot._id );
    }

  }
]);
