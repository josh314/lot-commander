import angular from 'angular';


/******************* View Lot Controller *************************/
angular.module('myApp').controller('GalleryCtrl', ['$scope', '$window', 'ImageSvc', 'loadLot', 'lotStore', function($scope, $window, ImageSvc, loadLot, lotStore){
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

    // const galleryContainer = $window.document.getElementById('gallery-container');
    // for(let _ of itemImages) {
    //   const itemGalleryContainer = $window.document.createElement('div');
    //   const itemGallery = $window.document.createElement('div');
    //   itemGallery.className = "row";
    //   const itemGalleryHeader = $window.document.createElement('h4');
    //   itemGalleryHeader.className = "text-center"
    //   itemGalleryHeader.appendChild($window.document.createTextNode(`${_.barcode}${_.description ? ` - ${_.description}`: ''}`));
    //   itemGallery.appendChild(itemGalleryHeader);
    //   itemGalleryContainer.appendChild(itemGallery);

    //   for(let img of _.images) {
    //     img.className = 'img-responsive inventory-gallery-img';

    //     const imgContainer = $window.document.createElement('div');
    //     imgContainer.className = 'item-image-gallery-item col-xs-6 col-sm-4 col-md-4 col-lg-2';

    //     const imgLink = $window.document.createElement('a');
    //     imgLink.href = img.src;

    //     imgLink.appendChild(img);
    //     imgContainer.appendChild(imgLink);
    //     itemGallery.appendChild(imgContainer);
    //   }

    //   galleryContainer.appendChild(itemGallery);
    // }
  };

  loadLot().then(()=>{
    loadImageGallery();    
  });
}]);