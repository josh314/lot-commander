import angular from 'angular';

/*********************** Lot media grid directive & controller ***********************/
angular.module('myApp').directive('lotMediaGridDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_lot_media_grid.html',
    scope: {
      lot: '=',
      mediaType: '=',
      removeMediaCb: '&',
      cancelMediaProcessingCb: '&',
      hideEditControls: '<?',
      suppressUpdatePrimaryOnClick: '<?',
    },
    controller: 'LotMediaGridDirCtrl as $ctrl',
  };
});


angular.module('myApp').controller( 'LotMediaGridDirCtrl', [

  '$scope',
  'MediaSvc',
  'ModalSvc',
  'navigate',

  function(

    $scope,
    MediaSvc,
    ModalSvc,
    navigate,

  ) {

    // Run init after lot loads
    $scope.$watch('lot', function() {
      if( $scope.lot ) {
        init();
      }
    });

    const vm = this;

    if( $scope.lot ) {
      init();
    }

    function init() {

      let media;
      if( isImageGrid() ) {
        media = $scope.lot && $scope.lot.images;
      }
      else if( isVideoGrid() ) {
        media = $scope.lot && $scope.lot.videos;
      }

      Object.assign(
        vm,
        {
          lot: $scope.lot,
          media,
          mediaType: $scope.mediaType,
          hideEditControls: $scope.hideEditControls,

          isImageGrid,
          isVideoGrid,
          updatePrimaryMedia,
          removeMedia,
          cancelMediaProcessing,
          editImage,
          openImagePreviewModal
        }
      );

    }

    function isImageGrid() {
      return $scope.mediaType === 'images';
    }

    function isVideoGrid() {
      return $scope.mediaType === 'videos';
    }

    // Manage images
    async function updatePrimaryMedia( mediaId ) {

      if( $scope.suppressUpdatePrimaryOnClick ) return;

      const resp = await MediaSvc.updateLotPrimaryMedia( vm.lot._id, mediaId, $scope.mediaType );
      if(!resp.error) {
        navigate.reload();
      }
      else {
        ModalSvc.message( { header: 'Error', body: resp.error, type: 'error' } );
      }
    }

    async function removeMedia( media ) {

      const isConfirmed = await ModalSvc.confirm( {
        header: `Remove ${ isImageGrid() ? 'Image' : 'Video' }`,
        body: `Are you sure you want to remove this ${ isImageGrid() ? 'image' : 'video' }?`,
      } );

      if( isConfirmed ) {

        let p = vm.lot.removeMedia( media, $scope.mediaType );

        if( $scope.removeMediaCb ) {
          p = p.then( () => $scope.removeMediaCb() );
        }

        await ModalSvc.wait( {
          waitFor: p
        } );

      }

    }

    async function cancelMediaProcessing( media ) {

      const isConfirmed = await ModalSvc.confirm( {
        header: `Cancel ${ isImageGrid() ? 'Image' : 'Video' } Processing`,
        body: `Are you sure you want to cancel this ${ isImageGrid() ? 'image' : 'video' } processing?`,
      } );

      if( isConfirmed ) {

        let p = vm.lot.cancelMediaProcessing( media, $scope.mediaType );

        if( $scope.cancelMediaProcessingCb ) {
          p = p.then( () => $scope.cancelMediaProcessingCb() );
        }

        await ModalSvc.wait( {
          waitFor: p
        } );

      }
    }

    function editImage( image ) {
      if(image.s3) {
        MediaSvc.setStore(image);
        navigate.imageEditor();
      }
      else {
        ModalSvc.message( { header: 'Error', body: 'This image cannot be edited.', type: 'error' } );
      }
    }

    function openImagePreviewModal( image ) {
      ModalSvc.imagePreview( vm.lot.getMediaLink( image ) );
    }


  }
]);