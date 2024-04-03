import angular from 'angular';

/******************* View Lot Controller *************************/
angular.module('myApp').controller('GalleryCtrl', [

  '$scope',
  'ImageSvc',
  'LotSvc',
  'ModalSvc',
  'navigate',

  function(
    $scope,
    ImageSvc,
    LotSvc,
    ModalSvc,
    navigate,
  ) {

    const vm = this;
    init();


    function init() {

      Object.assign(
        vm,
        {
          goBackToLot,
          saveCollageCb,

          revealAndRenderCollage,

          showCollage: false,
          collageSaved: false,

          productImages: [],
          galleryItems: [],

          isPrimaryImage: false,
        }
      );

      LotSvc.load()
        .then( lot => {

          vm.lot = lot;

          if( vm.lot && vm.lot.inventory && vm.lot.inventory.length ) {
            return loadImageGalleryFromInventory();
          }
          else if( vm.lot.manifestFileLocation ) {
            return loadImageGalleryFromManifestFile();
          }

        });

    }

    function goBackToLot() {

      return navigate.viewLot( vm.lot._id );

    }

    function revealAndRenderCollage() {

      vm.showCollage = true;
      vm.renderCollage = true;

    }

    function loadImageGalleryFromInventory() {

      const inventory = vm.lot.getInventorySortedByBarcode();

      const productImages = inventory.map( _ => ({ upc: _.barcode, title: _.description, images: _.images }) );

      populateGalleryImages( productImages );

    }

    function loadImageGalleryFromManifestFile() {

      vm.lot.getProductImagesFromManifestFile().then( imageItems => {

        populateGalleryImages( imageItems );

      });

    }

    function populateGalleryImages( productImages ) {

      vm.productImages = productImages;

      for(let i=0; i<productImages.length; i++) {

        const { upc, title, images } = productImages[i];
        const _ = { upc, title, images: [] };
        vm.galleryItems.push(_);

        for( let imageUrl of images ) {

          ImageSvc.loadImageWithTimeoutAndPlaceholder(10000, null)( imageUrl ).then( img => {

            // the following test throws out missing images and the single-pixel images
            if( img && img.width > 1 && img.height > 1 ) {
              _.images.push(img);
              $scope.$apply();
            }

          })
            .catch( _e => {
              console.log(`Error loading image ${ imageUrl }`);
            });
        }

      }

    }

    async function saveCollageCb() {

      vm.renderCollage = false;

      const yes = await ModalSvc.confirm({
        header: "Create another collage?",
        body: "The collage has been saved to the lot. Would you like to create another?",
      });

      if( yes ) {
        vm.isPrimaryImage = false;
        vm.renderCollage = true;
      }
      if( !yes ) {
        return goBackToLot();
      }

    }

  }
]);
