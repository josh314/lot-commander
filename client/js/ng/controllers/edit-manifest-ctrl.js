import angular from 'angular';


/******************* Edit Manifest Page Controller *************************/
angular.module('myApp').controller('EditManifestCtrl', [ 'lotStore', 'LotSvc', 'navigate', 'sessionTimeout',
  function( lotStore, LotSvc, navigate, sessionTimeout ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.addInventoryItem = lotStore.addInventory.bind( lotStore );
    vm.getInventory = lotStore.getInventorySortedByBarcode.bind( lotStore );
    vm.deleteInventoryItem = lotStore.deleteProduct.bind( lotStore );

    vm.saveManifest = () => LotSvc.saveManifest().then(()=>{
      navigate.viewLot( lotStore._id );
    });

  }
]);
