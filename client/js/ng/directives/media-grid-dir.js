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
      clearPrimary: '=?',
      hideSelectAll: '<?',

      // output
      selectedMedia: '=',
      primarySetCb: '&?',
      registerApi: '&?',
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
        this.isPrimary = false;
      }

      preview() {
        return ModalSvc.imagePreview( this.src );
      }

      toggleSelect() {
        this.selected = !this.selected;
      }

      setPrimary() {
        this.selected = true;
        this.isPrimary = true;
        if( $scope.primarySetCb ) {
          $scope.primarySetCb();
        }
      }

      unsetPrimary() {
        this.isPrimary = false;
      }

      reconcilePrimaryStatus() {
        if( !this.selected ) {
          this.isPrimary = false;
        }
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
          primarySet: false,
          showSelectAll: $scope.hideSelectAll !== true,

          isImageGrid,
          previewMedia,
          setMediaAsPrimary,

          allSelected,
          toggleAllSelected,

        }
      );

      $scope.itemsPerRow = $scope.itemsPerRow || 3;

      $scope.$watchCollection( 'media', function() {
        $scope.gridMedia = $scope.media.map( m => new GridImage( m, $scope.defaultSelected ) );
        vm.gridMedia = $scope.gridMedia;
      } );

      $scope.$watch(
        'gridMedia',

        // this function keeps $scope.selectedMedia updated
        function() {

          const selectedMedia = vm.gridMedia.filter( m => m.selected );
          if( selectedMedia.length === 0 ) {
            $scope.selectedMedia = [];
          }
          const primary = vm.gridMedia.find( m => m.isPrimary );
          $scope.selectedMedia = ( primary ? [ primary, ...selectedMedia.filter( m => m !== primary ) ] : selectedMedia ).map( m => m.src );

        },
        true // watches deeply
      );

      $scope.$watch( 'clearPrimary', function( newVal ) {
        if( newVal ) {
          vm.gridMedia.forEach( m => m.unsetPrimary() );
          $scope.clearPrimary = false;
        }
      } );

      if( $scope.registerApi ) {
        $scope.registerApi( {
          api: {
            allSelected,
            toggleAllSelected,
          }
        } );
      }

    }

    function isImageGrid() {
      return $scope.mediaType === 'images';
    }

    function previewMedia( media ) {
      if( isImageGrid() ) {
        media.preview();
      }
    }

    function allSelected() {
      return vm.gridMedia.length > 0 && vm.gridMedia.every( m => m.selected );
    }

    function toggleAllSelected( val ) {
      vm.gridMedia.forEach( m => m.selected = !!val );
    }

    function setMediaAsPrimary( media ) {

      if( !media ) { return; }

      vm.gridMedia.forEach( m => m.unsetPrimary() );
      media.setPrimary();

    }

  }
]);
