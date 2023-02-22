import angular from 'angular';


/******************* View Lot Controller *************************/
angular.module('myApp').controller('GalleryCtrl', [

  '$scope',
  'ImageSvc',
  'LotSvc',
  'ManifestFileHandlerSvc',
  'ModalSvc',
  'PalletManifestSvc',
  'ProductDataSvc',

  function( 
    $scope,
    ImageSvc,
    LotSvc,
    ManifestFileHandlerSvc,
    ModalSvc,
    PalletManifestSvc,
    ProductDataSvc
  ) {

    const vm = this;

    vm.items = [];

    function loadLotImageGallery() {

      vm.galleryType = 'lot';

      const inventory = LotSvc.getLotStore().getInventorySortedByBarcode();
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

    }

    function loadPalletImageGallery() {

      vm.galleryType = 'pallet';

      const pallet = vm.lot.pallet;

      pallet.documentsAreLoaded.then( _ => {

        const manifestFilename = angular.isArray(pallet.documents) && pallet.documents[0] ? pallet.documents[0].name : null;
        if( !manifestFilename ) {
          return ModalSvc.message({ header: 'Error', body: `No manifest for pallet ${pallet.handle}.`, type: 'error' });
        }

        PalletManifestSvc.loadPalletManifest( pallet, manifestFilename ).then( _manifest => {

          const { barcodes } = ManifestFileHandlerSvc.defaultProcessActiveManifest();

          ProductDataSvc.bulkGetProductData( barcodes ).then( resp => {

            console.log(resp);

            vm.palletProducts = resp.products.map( _ => _ .item ).filter( _item => _item.images && _item.images[0] );

          });

        });
  
      });

    }

    LotSvc.load( { populate: [ 'pallet' ], hydratePallet: true } ).then(()=>{

      vm.lot = LotSvc.getLotStore();

      if( vm.lot.pallet ) {
        loadPalletImageGallery();
      }
      else {
        loadLotImageGallery();    
      }


    });
  }
]);