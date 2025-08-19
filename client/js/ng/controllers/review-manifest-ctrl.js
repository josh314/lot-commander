import angular from 'angular';
import * as util from '../../utilities';

/******************* Review Manifest Page Controller *************************/
angular.module('myApp').controller('ReviewManifestCtrl', [

  'LotSvc',
  'ModalSvc',
  'navigate',
  'sessionTimeout',

  function(

    LotSvc,
    ModalSvc,
    navigate,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      Object.assign(
        vm,
        {

          displayItems: [],

          selectAll: false,
          showAsin: false,
          showTitle: true,
          showBrand: true,
          showQuantity: true,
          showPrice: true,

          addFallbackData,
          addInventoryItem,
          deleteInventoryItem,
          disableAddFallbackData,
          finishReviewing,
          editProductData,
          saveManifest,
          saveManifestAndExit,
          toggleSelectAll,
          toggleSelected,
          validateInventory,

          util,
        }
      );

      LotSvc.load( )
        .then( lot => {

          if( lot ) {

            vm.lot = lot;

            refreshDisplayItems();

            if( lot.hasAsins() ) {
              vm.showAsin = true;
            }

          }


        } );

    }

    function refreshDisplayItems() {
      vm.displayItems = vm.lot.getInventorySortedByBarcode();
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

    function deleteInventoryItem( item ) {
      vm.lot.deleteInventoryItem( item );
      refreshDisplayItems();
    }

    function addInventoryItem() {
      vm.lot.addInventory();
      refreshDisplayItems();
    }

    function editProductData( item ) {
      item.setAsDirty();
    }

    function toggleSelectAll() {
      vm.displayItems.filter( item => item.hasError() ).forEach( item => item.selected = vm.selectAll );
    }

    function toggleSelected() {
      vm.selectAll = vm.displayItems.filter( item => item.hasError() ).every( item => item.selected );
    }

    function disableAddFallbackData() {
      return !vm.displayItems.some( item => item.selected );
    }

    async function addFallbackData() {

      const selectedItems = vm.displayItems.filter( item => item.selected );
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
