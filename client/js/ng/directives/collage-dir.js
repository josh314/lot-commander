import angular from 'angular';

/*********************** Collage Directive ***********************/
angular.module('myApp').directive('collageDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_collage.html',
    scope: {
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

        const { image } = await ImageSvc.renderLotCollage( $scope.lotId );

        vm.imgSrc = image;

        $scope.isRendered = true;
        $scope.doRender = false;

        $scope.isSaved = false;

      }
      catch(e) {
        console.log(`Error setting image src: ${ e }`);
      }

    }

    async function saveImageToLot() {

      try {

        const blob = await fetch( vm.imgSrc ).then( res => res.blob() );

        const filename = `collage-img-${ crypto.randomUUID() }.png`;

        const file = new File( [ blob ], filename );

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