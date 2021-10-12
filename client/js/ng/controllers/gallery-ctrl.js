import angular from 'angular';


/******************* View Lot Controller *************************/
angular.module('myApp').controller('GalleryCtrl', ['$scope', 'ImageSvc', 'lotStore', 'LotSvc',
  function( $scope, ImageSvc, lotStore, LotSvc ){
    const vm = this;

    vm.lot = lotStore;
    vm.items = [];

    const loadImageGallery = function() {
      const inventory = lotStore.getInventorySortedByBarcode();
      for(let i=0; i<inventory.length; i++) {
        const item = inventory[i];
        if(item.images) {
          const _ = { barcode: item.barcode, description: item.description, images: [] };
          vm.items.push(_);
          for(let imageUrl of item.images) {
            ImageSvc.loadImageWithTimeoutAndPlaceholder(1000, null)(imageUrl).then(img=>{
              if(img) {
                _.images.push(img);
                $scope.$apply();
              }
            });
          }
        }
      }

    };

    LotSvc.load().then(()=>{
      loadImageGallery();    
    });
  }
]);