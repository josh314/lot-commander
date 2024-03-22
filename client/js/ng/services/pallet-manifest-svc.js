import angular from 'angular';

/******************* Service for managing pallet manifests ***/
angular.module('myApp').factory( 'PalletManifestSvc', [

  'InventoryPallet',
  'ShipmentManagerSvc',

  function(

    InventoryPallet,
    ShipmentManagerSvc,

  ) {

    return {
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

  }]);