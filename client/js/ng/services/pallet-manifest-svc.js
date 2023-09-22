import angular from 'angular';

/******************* Service for managing pallet manifests ***/
angular.module('myApp').factory( 'PalletManifestSvc', [

  'InventoryPallet',
  'ManifestFileHandlerSvc',
  'ShipmentManagerSvc',

  function(

    InventoryPallet,
    ManifestFileHandlerSvc,
    ShipmentManagerSvc,

  ) {

    return {
      loadPalletManifest,
      uploadInventoryPalletManifest,
      uploadExpectedPalletManifest
    };

    async function uploadInventoryPalletManifest( pallet, file, { category, quantity, units, removedItems, retailValue, salePrice } = {} ) {

      if( !pallet.uploadDocument ) {
        pallet = new InventoryPallet( pallet );
      }

      const _res = await pallet.uploadDocument( file, { documentType: 'manifest', isRestricted: false } );

      const palletEditDoc = {
        category,
        units: units || quantity,
        removedItems,
        retailValue,
        salePrice,
      };

      return pallet.edit( palletEditDoc );

    }

    async function uploadExpectedPalletManifest( _shipment, palletId, file, { category, quantity, units, retailValue, salePrice } = {} ) {

      const shipment = await ShipmentManagerSvc.hydrateShipment( _shipment );

      const _res = await shipment.uploadExpectedPalletDocument( palletId, file, { documentType: 'manifest', isRestricted: false } );

      const palletEditDoc = {
        category,
        units: units || quantity,
        retailValue,
        salePrice,
      };

      return shipment.editExpectedPallet( palletId, palletEditDoc );

    }

    function loadPalletManifest( pallet, manifestFilename ) {

      return pallet.getDocument( manifestFilename ).then( data => {

        ManifestFileHandlerSvc.parse( data, manifestFilename, { skipLastRows: 1 } ); //note we are assuming the last row is a totals row

        return ManifestFileHandlerSvc.getActiveManifest();
      });

    }

  }]);