import angular from 'angular';
import * as util from '../../utilities';

/******************* Edit Manifest Page Controller *************************/
angular.module('myApp').controller('EditManifestCtrl', [

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

          showAsin: false,

          validateInventory,
          addInventoryItem,
          deleteInventoryItem,
          editProductData,
          saveManifest,
          saveManifestAndExit,

          util,
        }
      );

      LotSvc.load( )
        .then( lot => {

          vm.lot = lot;

          if( lot && lot.hasAsins() ) {
            vm.showAsin = true;
          }

        } );

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
    }

    function addInventoryItem() {
      vm.lot.addInventory();
    }

    function editProductData( item ) {
      item.setAsDirty();
    }

    async function saveManifest() {

      if( validateInventory() ) {

        const manifest = await save();
        console.log('saveManifest result:', manifest);
        return { success: true, manifest };

      }
      else {

        ModalSvc.message( {
          header: 'Invalid data',
          html: `<p>The data for this manifest is invalid. Please correct these errors:</p> ${ vm.lot.composeInventoryErrorsHtmlMessage() }`,
          type: 'error',
        } );

        return { success: false };

      }

    }

    function saveManifestAndExit() {

      saveManifest().then( ( { success, manifest: _manifest } ) => {
        if( success ) {

          navigate.viewLot( vm.lot._id );

        }
      });

    }

  }
]);
