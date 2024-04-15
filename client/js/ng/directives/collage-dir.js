import angular from 'angular';
import * as util from '../../utilities';

const __COLLAGE_WIDTH__ = 1280;
const __COLLAGE_HEIGHT__ = 720;
const __COLLAGE_NUM_ROWS__ = 2;
const __COLLAGE_FILL__ = "white";

const __COLLAGE_HORIZONTAL_GUTTER_SIZE__ = 10;

/*********************** Collage Directive ***********************/
angular.module('myApp').directive('collageDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_collage.html',
    scope: {
      items: '=',
      lotId: '=',
      saveCb: '&',
      btnSize: '<',
      doRender: '=?',
      isRendered: '=?',
      hideRenderBtn: '<',
      doSave: '=?',
      hideSaveBtn: '<',
      disablePreviewModal: '<',
      isPrimaryImage: '=?',
      hideIsPrimaryImage: '<',
    },
    controller: 'CollageDirCtrl as $ctrl',
  };
});

angular.module('myApp').controller( 'CollageDirCtrl', [

  '$scope',
  'ImageSvc',
  'ModalSvc',

  function(

    $scope,
    ImageSvc,
    ModalSvc,

  ) {

    const vm = this;
    init();

    // Allows rendering of the collage to be triggered from outside the directive
    $scope.$watch('doRender', function() {
      if( $scope.doRender ) {
        renderAndWait();
      }
    });

    // Allows saving of the collage to be triggered from outside the directive
    $scope.$watch('doSave', function() {
      if( $scope.doSave ) {
        saveImageToLot();
      }
    });

    $scope.$watch('isSaved', function() {
      if( vm ) {
        vm.isSaved = $scope.isSaved;
      }
    });

    $scope.$watch('isRendered', function() {
      if( vm ) {
        vm.isRendered = $scope.isRendered;
      }
    });

    $scope.$watch('hideSaveBtn', function() {
      if( vm ) {
        vm.hideSaveBtn = $scope.hideSaveBtn;
      }
    });

    $scope.$watch('hideIsPrimaryImage', function() {
      if( vm ) {
        vm.hideIsPrimaryImage = $scope.hideIsPrimaryImage;
      }
    });

    function init() {

      $scope.isRendered = false;
      $scope.isSaved = false;

      Object.assign(
        vm,
        {

          id: crypto.randomUUID(),

          isRendered: $scope.isRendered,
          isSaved: false,
          hideRenderBtn: $scope.hideRenderBtn,
          btnNgClass: {},
          hideSaveBtn: $scope.hideSaveBtn,
          hideIsPrimaryImage: $scope.hideIsPrimaryImage,

          renderAndWait,
          saveImageToLot,
          openPreviewModal,
        }
      );

      if( $scope.btnSize ) {
        vm.btnNgClass[ `btn-${ $scope.btnSize }` ] = true;
      }

      clearDisplay();

    }

    function getProductImageSamples() {

      return $scope.items.map( _item => _item.images[ util.getRandomArrayIndex( _item.images ) ] ).filter( _ => _ );

    }

    function clearDisplay() {
      vm.imgSrc = null;
    }

    function renderAndWait() {
      return ModalSvc.wait({
        waitFor: render(),
        message: 'Rendering collage...',
      });
    }

    async function render() {

      try {

        $scope.isRendered = false;

        clearDisplay();

        $scope.canvas = new OffscreenCanvas( __COLLAGE_WIDTH__, __COLLAGE_HEIGHT__ );

        $scope.layout = await getLayout( getProductImageSamples(), { randomize: true } );

        draw();

        $scope.imageBlob = await $scope.canvas.convertToBlob();

        vm.imgSrc = URL.createObjectURL( $scope.imageBlob );

        $scope.isRendered = true;
        $scope.doRender = false;

        $scope.isSaved = false;

      }
      catch(e) {
        console.log(`Error setting image src: ${ e }`);
      }

    }


    async function getLayout( imageUrls, { randomize = false } = {} ) {

      const layout = [];

      // copy image array
      let _imageUrls = imageUrls.map( _ => _ );

      if( randomize ) {

        _imageUrls.sort( () => Math.random() - 0.5 );

      }

      const numHorizontalGutters = __COLLAGE_NUM_ROWS__ + 1;
      const horizontalGutterSize = __COLLAGE_HORIZONTAL_GUTTER_SIZE__;

      const rowHeight = Math.floor( ( __COLLAGE_HEIGHT__ - numHorizontalGutters * horizontalGutterSize ) / __COLLAGE_NUM_ROWS__ );


      for( let i=0; i<__COLLAGE_NUM_ROWS__; i++ ) {

        const collageItems = [];

        let j=0;
        let totalRowWidth = 0;

        while( j < _imageUrls.length ) {

          const _imageUrl = _imageUrls[j];
          j++;

          try {

            console.log(`Loading image ${ _imageUrl }`);

            const proxy = true;
            const image = await ImageSvc.loadImageWithTimeoutAndPlaceholder( 500, null, proxy )( _imageUrl );

            if( !image || image.width <= 1 || image.height <= 1 ) {
              console.log(`Rejecting image ${ _imageUrl }: ${ image.width } x ${ image.height }`);
              continue;
            }

            const scale = rowHeight / image.height < 1 ? rowHeight / image.height : 1;

            const scaledWidth = image.width * scale;
            const scaledHeight = image.height * scale;

            totalRowWidth += scaledWidth;

            if( totalRowWidth > __COLLAGE_WIDTH__ ) {
              break;
            }

            collageItems.push( {
              image,
              scaledWidth,
              scaledHeight,
            } );

          }
          catch(e) {
            console.log(`Error loading image ${ _imageUrl }`);
            continue;
          }

        }

        const leftoverX = __COLLAGE_WIDTH__ - collageItems.reduce( ( _total, _item ) => _total + _item.scaledWidth , 0 );
        const numVerticalGutters = collageItems.length + 1;
        const verticalGutterSize = Math.floor( leftoverX / numVerticalGutters );

        layout[i] = [];

        let currentDx = 0;
        for( let _item of collageItems ) {

          const {
            image,
            scaledWidth,
            scaledHeight
          } = _item;

          const leftoverY = rowHeight - scaledHeight;

          const layoutRowItem = {
            image,
            dx: currentDx + verticalGutterSize,
            dy: (i+1) * horizontalGutterSize + i * rowHeight + Math.floor( leftoverY / 2 ),
            dWidth: scaledWidth,
            dHeight: scaledHeight,
          };


          layout[i].push( layoutRowItem );

          currentDx += scaledWidth + verticalGutterSize;
        }

        _imageUrls = _imageUrls.slice( j );
      }

      return layout;
    }

    function draw() {

      const ctx = $scope.canvas.getContext("2d");
      ctx.fillStyle = __COLLAGE_FILL__;
      ctx.fillRect( 0, 0, __COLLAGE_WIDTH__, __COLLAGE_HEIGHT__ );

      for( let row of $scope.layout ) {

        for( let item of row ) {
          ctx.drawImage(
            item.image,
            item.dx,
            item.dy,
            item.dWidth,
            item.dHeight
          );
        }

      }

      return $scope.canvas;

    }

    async function saveImageToLot() {

      try {

        const filename = `collage-img-${ crypto.randomUUID() }.png`;

        const file = new File([$scope.imageBlob], filename );

        console.log(`Saving file ${ filename } to lot ${ $scope.lotId }`);
        await ModalSvc.wait( {
          waitFor: ImageSvc.uploadLotImage( $scope.lotId, file, $scope.isPrimaryImage ),
        } );

        console.log('Save successful.');

        $scope.isSaved = true;

        if( $scope.saveCb ) {
          $scope.saveCb();
        }

        $scope.doSave = false;


      }
      catch(e) {
        console.error(e);
        ModalSvc.message({ header: 'Error', body: `Error saving image. Try again or render another collage.`, type: 'error' });
      }

    }

    function openPreviewModal() {

      return ModalSvc.imagePreview( vm.imgSrc );

    }

  }
]);