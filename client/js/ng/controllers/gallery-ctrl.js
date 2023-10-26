import angular from 'angular';

function getRandomArrayIndex( arr ) {
  return Math.floor(Math.random() * arr.length ); // 0 <= Math.random() < 1
}


/******************* View Lot Controller *************************/
angular.module('myApp').controller('GalleryCtrl', [

  '$scope',
  'CollageSvc',
  'ImageSvc',
  'LotSvc',
  'ManifestFileHandlerSvc',
  'ModalSvc',
  'navigate',
  'PalletManifestSvc',
  'ProductDataSvc',

  function(
    $scope,
    CollageSvc,
    ImageSvc,
    LotSvc,
    ManifestFileHandlerSvc,
    ModalSvc,
    navigate,
    PalletManifestSvc,
    ProductDataSvc
  ) {

    const vm = this;
    init();


    function init() {

      Object.assign(
        vm,
        {
          goBackToLot,

          revealAndRenderCollage,
          renderCollage,
          saveCollageToLot,

          showCollage: false,
          collageSaved: false,

          collage: {
            height: 540,
            width: 960,
            fill: "white",
            numRows: 2,
          },

          items: [],
        }
      );

      LotSvc.load( { populate: [ 'pallet' ], hydratePallet: true } ).then(()=>{

        vm.lot = LotSvc.getLotStore();

        if( vm.lot.pallet ) {
          return loadPalletImageGallery();
        }
        else {
          return loadLotImageGallery();
        }

      });

    }

    function goBackToLot() {

      return navigate.viewLot( vm.lot._id );

    }


    function loadLotImageGallery() {

      const inventory = LotSvc.getLotStore().getInventorySortedByBarcode();

      const productItems = inventory.map( _ => ({ upc: _.barcode, title: _.description, images: _.images }) );

      populateGalleryImages( productItems );

    }

    function loadPalletImageGallery() {

      const pallet = vm.lot.pallet;

      pallet.documentsAreLoaded.then( _ => {

        const manifestFilename = angular.isArray(pallet.documents) && pallet.documents[0] ? pallet.documents[0].name : null;
        if( !manifestFilename ) {
          return ModalSvc.message({ header: 'Error', body: `No manifest for pallet ${pallet.handle}.`, type: 'error' });
        }

        PalletManifestSvc.loadPalletManifest( pallet, manifestFilename ).then( _manifest => {

          const { barcodes } = ManifestFileHandlerSvc.defaultProcessActiveManifest();

          ProductDataSvc.bulkGetProductData( barcodes ).then( resp => {

            populateGalleryImages( resp.products.map( _ => _.item ) );

          });

        });

      });

    }

    function populateGalleryImages( productItems ) {

      for(let i=0; i<productItems.length; i++) {
        const item = productItems[i];
        if(item.images) {
          const _ = { upc: item.upc, title: item.title, images: [] };
          vm.items.push(_);
          for(let imageUrl of item.images) {
            ImageSvc.loadImageWithTimeoutAndPlaceholder(10000, null)(imageUrl).then(img=>{
              // the following test throws out missing images and the single-pixel images
              if( img && img.width > 1 && img.height > 1 ) {
                _.images.push(img);
                $scope.$apply();
              }
            });
          }
        }
      }

    }

    // }

    function getProductImageSamples() {

      return vm.items.map( _item => _item.images[ getRandomArrayIndex( _item.images ) ] ).filter( _ => _ );

    }

    async function renderCollage() {

      CollageSvc.loadCanvas( "#collage-canvas" );

      CollageSvc.setDimensions( vm.collage.width, vm.collage.height );
      CollageSvc.setFill( vm.collage.fill );

      await CollageSvc.setLayout( vm.collage.numRows, getProductImageSamples(), { randomize: true } );

      CollageSvc.draw( );
      vm.collageSaved = false;

    }

    function revealAndRenderCollage() {

      vm.showCollage = true;

      renderCollage();

    }

    async function saveCollageToLot() {

      const blob = await CollageSvc.exportAsBlob();

      if( blob ) {
        const file = new File([blob], `collage-img-${ (new Date()).getTime() }.png`);

        await ModalSvc.wait( {
          waitFor: ImageSvc.uploadLotImages( LotSvc.getLotStore(), [ file ] ),
          delay: 1000
        } );
        vm.collageSaved = true;

        const yes = await ModalSvc.confirm({
          header: "Create another collage?",
          body: "The collage has been saved to the lot. Would you like to create another?",
        });

        if( yes ) {
          return renderCollage();
        }
        else {
          return goBackToLot();
        }

      }
      else {
        ModalSvc.message({ header: 'Error', body: `Error saving image.`, type: 'error' });
      }

    }

  }
]);

/******************* Collage Service *************************/
//
// This service manages the collage on the gallery page
//
angular.module('myApp').service( 'CollageSvc', [

  '$document',

  function(

    $document,

  ) {

    let _canvas = null;
    let _width = null;
    let _height = null;
    let _fill = null;
    let _layout = null;


    return {
      loadCanvas,
      getCanvas,
      setDimensions,
      setFill,
      setLayout,
      draw,
      exportAsBlob,
    };

    function loadCanvas( canvasId ) {

      _canvas = $document[0].querySelector( canvasId );
      return _canvas;

    }

    function getCanvas() {
      return _canvas;
    }

    function setDimensions( width, height ) {
      _width = width;
      _height = height;
    }

    function setFill( fill ) {
      _fill = fill;
    }

    async function setLayout( numRows, images, { randomize = false, proxy = false } = {} ) {

      _layout = [];

      if( !_width || !_height || !numRows || !images || !images.length ) {
        return;
      }

      // copy image array
      let _images = images.map( _ => _ );

      if( randomize ) {

        _images.sort( () => Math.random() - 0.5 );

      }

      const rowHeight = Math.floor( _height / numRows );


      for( let i=0; i<numRows; i++ ) {

        const items = [];

        let j=0;
        let totalRowWidth = 0;

        while( j < _images.length ) {

          const _image = _images[j];

          const scale = rowHeight / _image.height < 1 ? rowHeight / _image.height : 1;

          const scaledWidth = _image.width * scale;
          const scaledHeight = _image.height * scale;

          totalRowWidth += scaledWidth;

          if( totalRowWidth > _width ) {
            break;
          }

          let image;
          if( proxy ) {

            // Here we create a new image, proxied from the server to get around CORS issues
            image = new Image();
            image.crossOrigin = 'anonymous';
            const url = `/api/image/proxy?url=${encodeURIComponent( _image.src )}`;
            await new Promise(r => { image.onload=r; image.src=url; });

          }
          else {
            image = _image;
          }

          items.push( {
            image,
            scaledWidth,
            scaledHeight,
          } );

          j++;
        }

        const leftoverX = _width - items.reduce( ( _total, _item ) => _total + _item.scaledWidth , 0 );
        const numGutters = items.length + 1;
        const gutterSize = Math.floor( leftoverX / numGutters );

        _layout[i] = [];

        let currentDx = 0;
        for( let _item of items ) {

          const {
            image,
            scaledWidth,
            scaledHeight
          } = _item;

          const leftoverY = rowHeight - scaledHeight;

          const layoutRowItem = {
            image,
            dx: currentDx + gutterSize,
            dy: i * rowHeight + Math.floor( leftoverY / 2 ),
            dWidth: scaledWidth,
            dHeight: scaledHeight,
          };


          _layout[i].push( layoutRowItem );

          currentDx += scaledWidth + gutterSize;
        }

        _images = _images.slice( j );
      }

    }


    function draw() {

      const ctx = _canvas.getContext("2d");
      ctx.fillStyle = _fill;
      ctx.fillRect( 0, 0, _width, _height );

      for( let row of _layout ) {

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

      return _canvas;

    }

    async function exportAsBlob() {

      // Here we create new images, proxied from the server to get around CORS issues
      for( let _row of _layout ) {
        for( let _item of _row ) {

          try {

            const image = new Image();
            image.crossOrigin = 'anonymous';
            const url = `/api/image/proxy?url=${encodeURIComponent( _item.image.src )}`;
            await new Promise( ( resolve , reject ) => {

              image.onload = resolve;
              image.src = url;
              image.onerror = reject;

            });

            _item.image = image;
          }
          catch( e ) {
            console.error( e );
            return;
          }

        }
      }

      // re-draw
      _canvas = new OffscreenCanvas( _width, _height );
      draw();

      return _canvas.convertToBlob();

    }

  }
]);