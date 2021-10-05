import angular from 'angular';

/****************** Past images modal controller ***********************/
angular.module('myApp').controller('PastImagesGalleryModalCtrl', [ '$q', '$uibModalInstance', 'ImageSvc',
  function( $q, $uibModalInstance, ImageSvc ){

    const vm = this;

    const __PAGE_SIZE__ = 100;

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __PAGE_SIZE__,
      pageChange: refreshDisplayList
    };

    const loadImages = () => {

      $q.when( ImageSvc.getImageList( { urlEncode: true } ) ).then( resp => {

        vm.images = resp.images.map( _ => ({ link: _, selected: false }) );
        vm.pagination.totalItems = vm.images.length;

        refreshDisplayList();

        vm.waitingToLoad = false;
      });

    };

    vm.confirmSelected = () => {

      const selectedImages = vm.images.filter( _ => _.selected ).map( _ => _.link );

      $uibModalInstance.close( { images: selectedImages } );

    };

    function refreshDisplayList( ) {
      const begin = __PAGE_SIZE__ * ( vm.pagination.current - 1 );
      const end = __PAGE_SIZE__ * ( vm.pagination.current );
      vm.displayList = vm.images.slice( begin, end );
    }

    const init = () => {
      vm.waitingToLoad = true;
      loadImages();
    };
    init();

  }
]);
