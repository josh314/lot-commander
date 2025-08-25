import angular from 'angular';
import * as util from '../../utilities';
const __MAX_DISPLAY_INVENTORY__ = 50;

/******************* Review Manifest Page Controller *************************/
angular.module('myApp').controller('ReviewManifestCtrl', [

  'LotSvc',
  'MediaSvc',
  'ModalSvc',
  'navigate',
  'ProductDataSvc',
  'sessionTimeout',

  function(

    LotSvc,
    MediaSvc,
    ModalSvc,
    navigate,
    ProductDataSvc,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      Object.assign(
        vm,
        {

          pagination: {
            current: 1,
            totalItems: 0,
            pageSize: __MAX_DISPLAY_INVENTORY__,
            pageChange: refreshDisplayInventory,
            maxSize: 8
          },

          displayInventory: [],

          selectAll: false,
          showImage: true,
          showAsin: false,
          showTitle: true,
          showBrand: true,
          showQuantity: true,
          showPrice: true,

          addFallbackData,
          addInventoryItem,
          amazonUrlFromAsin: ProductDataSvc.amazonUrlFromAsin,
          deleteInventoryItem,
          disableAddFallbackData,
          finishReviewing,
          editProductData,
          numInventoryItemsInvalidOnPage,
          editItemImages,
          saveManifest,
          saveManifestAndExit,
          toggleSelectAll,
          toggleSelected,
          updateItemFromTitleSearch,
          validateInventory,

        }
      );

      LotSvc.load( )
        .then( lot => {

          if( lot ) {

            vm.lot = lot;

            refreshDisplayInventory();

            if( lot.hasAsins() ) {
              vm.showAsin = true;
            }

          }


        } );

    }

    const initializeAllThumbnailImages = () => {
      const limit = Math.min( vm.displayInventory.length, __MAX_DISPLAY_INVENTORY__ );

      for(let i=0; i < limit; i++) {
        const item = vm.displayInventory[i];
        MediaSvc.loadRepresentativeImage({
          images: item.data.images,
          containerId: `item-thumbnail-container-${ item.data.barcode || '' }`,
          className: "inventory-preview-img"
        });
      }
    };

    function refreshDisplayInventory() {
      const inventory = vm.lot.getInventorySortedByBarcode();
      vm.pagination.totalItems = inventory.length;
      const start = ( vm.pagination.current - 1 ) * __MAX_DISPLAY_INVENTORY__;
      const end = start + __MAX_DISPLAY_INVENTORY__;
      vm.displayInventory = inventory.slice( start, end );
      initializeAllThumbnailImages();
    }

    function refreshInventoryItemImage( inventoryItem ) {

      MediaSvc.loadRepresentativeImage({
        images: inventoryItem.data.images,
        containerId: `item-thumbnail-container-${ inventoryItem.data.barcode || ''}`,
        className: "inventory-preview-img",
        replace: true
      });

    }

    async function editItemImages( inventoryItem ) {
      const images = await ModalSvc.reviewImages( inventoryItem.data.images );
      if( !util.isEqual( images , inventoryItem.data.images ) ) {
        inventoryItem.update( { images } );
        refreshInventoryItemImage( inventoryItem );
      }
    }

    const save = () => {
      return vm.lot.saveManifest().then( manifest => {

        if( manifest ) {
          vm.lot.manifestId = manifest._id;
        }

        return manifest;
      });
    };

    function validateInventory() {
      return vm.lot && vm.lot.validateInventory();
    }

    function numInventoryItemsInvalidOnPage() {
      if( vm.displayInventory ) {
        return vm.displayInventory.filter( item => item.hasError() ).length;
      }
    }

    function deleteInventoryItem( item ) {
      vm.lot.deleteInventoryItem( item );
      refreshDisplayInventory();
    }

    function addInventoryItem() {
      vm.lot.addInventory();
      refreshDisplayInventory();
    }

    function editProductData( item ) {
      item.setAsDirty();
    }

    function toggleSelectAll() {
      vm.displayInventory.filter( item => item.hasError() ).forEach( item => item.selected = vm.selectAll );
    }

    function toggleSelected() {
      vm.selectAll = vm.displayInventory.filter( item => item.hasError() ).every( item => item.selected );
    }

    function disableAddFallbackData() {
      return !vm.displayInventory.some( item => item.selected );
    }

    async function addFallbackData() {

      const selectedItems = vm.displayInventory.filter( item => item.selected );
      if( selectedItems.length === 0 ) {
        return;
      }

      const isConfirmed = await ModalSvc.confirm( {
        header: 'Add fallback data?',
        body: `This will add fallback data to ${ selectedItems.length } selected item(s) that are missing data. Continue?`,
        type: 'warning',
        trueText: 'Yes',
        falseText: 'Cancel'
      } );

      if( isConfirmed ) {

        selectedItems.forEach( item => {
          item.addFallbackData();
          item.selected = false;
        });

        vm.selectAll = false;

      }

    }

    async function updateItemFromTitleSearch( inventoryItem ) {

      const query = inventoryItem.data.title;

      const selectedProduct = await ModalSvc.productDataSearch( query );

      if( !selectedProduct ) {
        return;
      }

      const replacementData = await ModalSvc.productDataMerge( inventoryItem.data, selectedProduct );

      if( replacementData ) {
        inventoryItem.update( replacementData );
        if( replacementData.images ) {
          refreshInventoryItemImage( inventoryItem );
        }
      }

    }

    async function saveManifest() {

      if( !validateInventory() ) {

        const isConfirmed = await ModalSvc.confirm( {
          header: 'Invalid data',
          html: `<p>The data for this manifest is invalid with the following errors:</p> ${ vm.lot.composeInventoryErrorsHtmlMessage() }`,
          type: 'error',
          trueText: 'Save anyway',
          falseText: 'Cancel'
        } );

        if( !isConfirmed ) {
          return { success: false };
        }

      }

      const manifest = await save();
      console.log('saveManifest result:', manifest);
      return { success: true, manifest };

    }

    function saveManifestAndExit() {

      saveManifest().then( ( { success, manifest: _manifest } ) => {
        if( success ) {

          navigate.viewLot( vm.lot._id );

        }
      });

    }

    async function finishReviewing() {

      const isConfirmed = await ModalSvc.confirm({
        header: 'Finished?',
        body: 'This will save the current manifest and mark the lot as reviewed. Continue?'
      });

      if( isConfirmed ) {

        const { success, manifest: _manifest } = await saveManifest();

        if( success ) {
          vm.lot.markAsReviewed();
          await vm.lot.save();
          navigate.viewLot( vm.lot._id );
        }

      }

    }

  }
]);
