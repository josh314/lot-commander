
import angular from 'angular';

/******************* View Lot Controller *************************/
angular.module('myApp').controller('GalleryCtrl', [

  '$scope',
  'LotSvc',
  'MediaSvc',
  'ModalSvc',
  'navigate',

  function(
    $scope,
    LotSvc,
    MediaSvc,
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

      const productItems = inventory.map( _ => ({ upc: _.barcode, title: _.description, images: _.images }) );

      populateGalleryImages( productItems );

    }

    function loadImageGalleryFromManifestFile() {

      vm.lot.getProductDataFromManifestFile().then( populateGalleryImages );

    }

    function populateGalleryImages( productItems ) {

      for(let i=0; i<productItems.length; i++) {

        const { upc, title, images } = productItems[i];
        const _ = { upc, title, images: [] };
        vm.galleryItems.push(_);

        for( let imageUrl of images ) {

          MediaSvc.loadImageWithTimeoutAndPlaceholder(10000, null)( imageUrl ).then( img => {

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
