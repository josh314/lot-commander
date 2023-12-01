import angular from 'angular';

const __MAX_DISPLAY_INVENTORY__ = 50;

/******************* View Lot Controller *************************/
angular.module('myApp').controller( 'ViewLotCtrl', [

  '$uibModal',
  'ImageSvc',
  'InventoryPalletManagerSvc',
  'listingsBoilerplate',
  'ListingsSvc',
  'LoggedInUser',
  'lotStore',
  'LotSvc',
  'ModalSvc',
  'navigate',
  'PrintSvc',
  'sessionTimeout',

  function(

    $uibModal,
    ImageSvc,
    InventoryPalletManagerSvc,
    listingsBoilerplate,
    ListingsSvc,
    LoggedInUser,
    lotStore,
    LotSvc,
    ModalSvc,
    navigate,
    PrintSvc,
    sessionTimeout,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          showEditingControls: LoggedInUser.hasPermission( 'EDIT_LOT' ),
          showDeleteButton: LoggedInUser.hasPermission( 'DELETE_LOT' ),
          showPricingData: LoggedInUser.hasPermission( 'VIEW_PRICING_DATA' ),
          waitingForResponse: false,

          listingsBoilerplate,

          // images methods
          getImageLink,
          updatePrimaryImage,
          uploadImages,
          removeImage,
          editImage,
          addLotImageMethod: 'file',
          setAddLotImageMethod: s => vm.addLotImageMethod = s,
          addLotImageMethodIs: s => ( vm.addLotImageMethod === s ),


          // Lot editing
          editLot,
          editShippingItemsCb,
          deleteLot,


          // shipping items display
          showShippingItems: false,
          toggleShowShippingItems: () => vm.showShippingItems = !vm.showShippingItems,


          configureListingForSubmission,
          scanItems,
          editManifest,
          linkManifestBlock,
          readableDate,
          openGallery,
          printShippingItemsLabels,
          generateManifestFileForScannedInventory,
          openRecentImageGallery,
          confirmAddLotImage,
          cloneImageFromSelectedUrl: () => cloneImageFromUrl( vm.imageUrlToClone ),
          showPalletDetails,

          getBodyHtml,

          pagination:{
            current: 1,
            totalItems: 0,
            pageSize: __MAX_DISPLAY_INVENTORY__,
            pageChange: refreshDisplayInventory,
            maxSize: 8
          },

        }
      );


      LotSvc.load( { populate: ['pallet'] } )
        .then( lot =>{

          vm.lot = lotStore;

          vm.images = lot.images;
          refreshDisplayInventory();
          // initializeAllThumbnailImages( lot );
        })
        .then( _ => vm.titleTooLong = ListingsSvc.isTitleTooLong(lotStore.listingData.title) );

    }


    /*************************************************
    * Images
    * =========
    *
    ************/

    const initializeAllThumbnailImages = () => {
      const limit = Math.min( vm.displayInventory.length, __MAX_DISPLAY_INVENTORY__ );

      for(let i=0; i < limit; i++) {
        const item = vm.displayInventory[i];
        ImageSvc.loadRepresentativeImage({images: item.images, containerId: `item-thumbnail-container-${item.barcode}`, className: "inventory-preview-img"});
      }
    };

    function refreshDisplayInventory() {
      const sortedInventory = lotStore.getInventorySortedByBarcode();
      vm.pagination.totalItems = sortedInventory.length;
      const start = ( vm.pagination.current - 1 ) * __MAX_DISPLAY_INVENTORY__;
      const end = start + __MAX_DISPLAY_INVENTORY__;
      vm.displayInventory = sortedInventory.slice( start, end );
      initializeAllThumbnailImages();
    }

    function getImageLink(image) {
      return image.s3 ? `/api/image/?s3=${encodeURIComponent(image.s3)}` : image.filename;
    }

    // Manage images
    async function updatePrimaryImage(image) {
      const resp = await ImageSvc.updateLotPrimaryImage(lotStore, image);
      if(!resp.error) {
        navigate.reload();
      }
      else {
        ModalSvc.message( { header: 'Error', body: resp.error, type: 'error' } );
      }
    }

    async function uploadImages() {

      await ModalSvc.wait( {
        waitFor: ImageSvc.uploadLotImages(lotStore, vm.imagesToUpload),
        delay: 5000
      } );

      navigate.reload();

    }

    function removeImage(image) {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_remove_image_modal.html',
        size: 'lg',
        backdrop: 'static',
      });

      modalInstance.result.then(async function () {
        const resp = await ImageSvc.removeLotImage(lotStore, image);
        if(!resp.data.error) {
          navigate.reload();
        }
        else {
          ModalSvc.message( { header: 'Error', body: resp.data.error, type: 'error' } );
        }
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
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


    /*************************************************
    * Editing
    * =========
    *
    ************/


    function editLot() {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_edit_lot_modal.html',
        size: 'lg',
        controller: 'EditLotModalCtrl as $ctrl',
        backdrop: 'static',
        resolve: {
          lot: function () {
            return JSON.parse( JSON.stringify( lotStore ) ); // deep clone of lot so edits are ephemeral before save
          }
        },
      });

      modalInstance.result.then( lot => {

        if( !lot.category ) {
          lot.category = '';
        }

        LotSvc.edit( lot._id, lot ).then( _lot =>{
          navigate.reload();
        });

      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }


    function scanItems() {
      let manP;
      if( lotStore.manifestId ) {
        manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
          lotStore.setInventory( manifest.inventory );
        });
      }

      manP ? manP.then( _ => navigate.scanLot() ) : navigate.scanLot();

    }

    function editManifest() {
      let manP;
      if(lotStore.manifestId) {
        manP = LotSvc.getManifest( lotStore.manifestId ).then( manifest => {
          lotStore.setInventory( manifest.inventory );
        });
      }

      manP ? manP.then( _ => navigate.editLotManifest() ) : navigate.editLotManifest();

    }

    function linkManifestBlock() {
      vm.waitingForResponse = true;
      LotSvc.import3rdPartyManifestBlock( { lot: lotStore, blockId: vm.searchBlockId } ).then( resp => {

        if(resp.data.error) {
          ModalSvc.message( { header: 'Error', body: resp.data.error, type: 'error' } );
        }
        vm.waitingForResponse = false;
        navigate.reload();

      });
    }

    const validateShippingItems = () => {
      if(!lotStore.shippingItems || lotStore.shippingItems.length <=0 ) {
        return false;
      }

      return lotStore.shippingItems.every(item => {
        return parseInt(item.weight) && item.weightUnits &&
          parseInt(item.height) && item.heightUnits &&
          parseInt(item.length) && item.lengthUnits &&
          parseInt(item.width) && item.widthUnits;
      });
    };

    function configureListingForSubmission() {

      if( !LoggedInUser.hasMarketplacePermission( lotStore.destinationMarketplace ) ) {
        let msg = `User is not authorized to submit to marketplace: ${lotStore.destinationMarketplace}. Choose another marketplace.`;
        ModalSvc.message( { header: 'Unauthorized marketplace', body: msg , type: 'error' } );
        return;
      }

      const missingFields = [];
      if(!lotStore.listingData.title) {
        missingFields.push('title');
      }
      if(!lotStore.listingData.body) {
        missingFields.push('body');
      }
      if(!lotStore.getHandle()) {
        missingFields.push('handle');
      }
      if(!lotStore.numBoxes && !validateShippingItems() ) {
        missingFields.push('shipping items');
      }
      if(vm.images.length <= 0) {
        missingFields.push('images');
      }


      if(!missingFields.length) {
        navigate.submitListing();
      }
      else {
        let msg = `Must input the following data before submission: ${missingFields}`;
        ModalSvc.message( { header: 'Incomplete Lot', body: msg , type: 'error' } );
      }
    }

    function deleteLot(lotId) {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_delete_lot_modal.html',
        size: 'lg',
        backdrop: 'static',
      });

      modalInstance.result.then(function () {
        LotSvc.delete( lotId );
        navigate.listLots();
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }

    function readableDate(date) {
      return (new Date(date)).toLocaleString();
    }

    function openGallery() {
      navigate.lotGallery( lotStore._id );
    }

    // DEPRECATED
    // function editShippingItems() {
    //   return ModalSvc.shippingItems( lotStore.shippingItems )
    //     .then(shippingItems => {
    //       if(shippingItems) {
    //         lotStore.shippingItems = shippingItems;
    //         return LotSvc.edit( lotStore._id , lotStore ).then( _lot => {
    //           return true;
    //         });
    //       }
    //       else {
    //         return false;
    //       }
    //     });
    // }

    function editShippingItemsCb (shippingItems) {
      if(shippingItems) {
        lotStore.shippingItems = shippingItems;
        return LotSvc.edit( lotStore._id , lotStore ).then( _lot => {
          navigate.reload();
        });
      }
      else {
        return false;
      }
    }

    // DEPRECATED
    // TODO: is this use of editShippingItems() kosher?
    // function printLabels() {
    //   const isPrinting = PrintSvc.printLotLabels( lotStore );
    //   if(!isPrinting) {
    //     editShippingItems().then(isEdited=>{
    //       if(isEdited) {
    //         PrintSvc.printLotLabels( lotStore );
    //       }
    //     });
    //   }
    // }

    function generateManifestFileForScannedInventory() {

      LotSvc.generateManifest( lotStore._id, true, false ).then( () => {
        navigate.reload();
      });

    }

    function printShippingItemsLabels() {

      if( !lotStore.shippingItems || lotStore.shippingItems.length === 0 ) {
        return ModalSvc.message( {
          header: 'Nothing to print',
          html: `<p>The split group <strong>${ lotStore.label }</strong> has no shipping items configured.</p>`,
          type: 'warning'
        } );
      }

      PrintSvc.printLotShippingItemsLabels( lotStore._id );

    }


    function openRecentImageGallery() {
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_past_images_gallery_modal.html',
        size: 'lg',
        controller: 'PastImagesGalleryModalCtrl as $ctrl',
        backdrop: 'static',
      });

      modalInstance.result.then(function ( res ) {

        if( res.images.length ) {

          LotSvc.cloneImages( lotStore._id, res.images ).then( resp => {
            console.log(resp);
            navigate.reload();
          });

        }

      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    }

    function confirmAddLotImage( event ) {

      const imgUrl = event.target.currentSrc;

      ModalSvc.confirm({
        header: "Add Image",
        body: "Add this as a lot image?",
        html: `<img src="${ imgUrl }" />`
      }).then( isConfirmed => {

        if( isConfirmed ) {

          return cloneImageFromUrl( imgUrl );

        }

      } );

    }

    function cloneImageFromUrl( url ) {

      if( !url ) { // TODO: check if valid URL
        return;
      }

      LotSvc.cloneImages( lotStore._id, [ url ] ).then( resp => {
        console.log(resp);
        navigate.reload();
      });

    }

    function showPalletDetails() {
      InventoryPalletManagerSvc.get( vm.lot.pallet._id, { populate: [ 'shipment', 'splitFrom' ] } ).then( pallet => pallet.detailsModal() );
    }

    function getBodyHtml() {
      return lotStore.getBodyHtml();
    }


  }]
);
