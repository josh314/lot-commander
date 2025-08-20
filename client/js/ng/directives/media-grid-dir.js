import angular from 'angular';

/*********************** media grid directive & controller ***********************/
angular.module('myApp').directive('mediaGridDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_media_grid.html',
    scope: {
      media: '<',
      mediaType: '=',
      itemsPerRow: '<',
      defaultSelected: '=',
      selectedMedia: '=',
    },
    controller: 'MediaGridDirCtrl as $ctrl',
  };
});


angular.module('myApp').controller( 'MediaGridDirCtrl', [

  '$scope',
  'ModalSvc',

  function(

    $scope,
    ModalSvc

  ) {

    class GridImage {

      constructor( src, selected = false ) {
        this.src = src;
        this.selected = !!selected;
      }

      preview() {
        return ModalSvc.imagePreview( this.src );
      }

      toggleSelect() {
        this.selected = !this.selected;
      }

    }

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          gridMedia: [],
          mediaType: $scope.mediaType || 'images',

          isImageGrid,
          previewMedia,

        }
      );

      $scope.itemsPerRow = $scope.itemsPerRow || 3;

      $scope.$watchCollection( 'media', function() {
        $scope.gridMedia = $scope.media.map( m => new GridImage( m, $scope.defaultSelected ) );
        vm.gridMedia = $scope.gridMedia;
      } );
      $scope.$watch( 'gridMedia', updateSelectedMedia, true );

    }

    function isImageGrid() {
      return $scope.mediaType === 'images';
    }

    function previewMedia( media ) {
      if( isImageGrid() ) {
        media.preview();
      }
    }

    function updateSelectedMedia() {
      $scope.selectedMedia = vm.gridMedia.filter( m => m.selected ).map( m => m.src );
    }

  }
]);
