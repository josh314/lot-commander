import angular from 'angular';

/*********************** Lot image grid directive & controller ***********************/
angular.module('myApp').directive('lotImageGridDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_lot_image_grid.html',
    scope: {
      lot: '=',
      hideEditControls: '<?',
      suppressUpdatePrimaryOnClick: '<?',
    },
    controller: 'LotImageGridDirCtrl as $ctrl',
  };
});


angular.module('myApp').controller( 'LotImageGridDirCtrl', [

  '$scope',
  'ImageSvc',
  'navigate',
  'ModalSvc',

  function(

    $scope,
    ImageSvc,
    navigate,
    ModalSvc,

  ) {

    // In case the lot doesn't load in time in the parent scope for the directive to be able to access it
    $scope.$watch('lot', function() {
      if( $scope.lot ) {
        vm.lot = $scope.lot;
      }
    });

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {
          lot: $scope.lot,
          hideEditControls: $scope.hideEditControls,

          updatePrimaryImage,
          removeImage,
          editImage,
          openImagePreviewModal
        }
      );

    }

    // Manage images
    async function updatePrimaryImage( imageId ) {

      if( $scope.suppressUpdatePrimaryOnClick ) return;

      const resp = await ImageSvc.updateLotPrimaryImage( vm.lot._id, imageId );
      if(!resp.error) {
        navigate.reload();
      }
      else {
        ModalSvc.message( { header: 'Error', body: resp.error, type: 'error' } );
      }
    }

    async function removeImage( image ) {

      const isConfirmed = await ModalSvc.confirm( {
        header: 'Remove Image',
        body: 'Are you sure you want to remove this image?',
      } );

      if( isConfirmed ) {

        await ModalSvc.wait( {
          waitFor: vm.lot.removeImage( image )
        } );

      }

    }

    function editImage( image ) {
      if(image.s3) {
        ImageSvc.setStore(image);
        navigate.imageEditor();
      }
      else {
        ModalSvc.message( { header: 'Error', body: 'This image cannot be edited.', type: 'error' } );
      }
    }

    function openImagePreviewModal( image ) {
      ModalSvc.imagePreview( vm.lot.getImageLink( image ) );
    }


  }
]);