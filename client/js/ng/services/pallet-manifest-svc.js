import angular from 'angular';

/******************* Service for managing pallet manifests ***/
angular.module('myApp').factory( 'PalletManifestSvc', [

  'ShipmentManagerSvc',

  function(

    ShipmentManagerSvc,

  ) {

    return {
      uploadReceivedPalletManifest: uploadReceivedPalletManifest,
      uploadExpectedPalletManifest: uploadExpectedPalletManifest
    };

    async function uploadReceivedPalletManifest( pallet, file, { category, quantity, units, numUnitsRemoved, retailValue, salePrice } = {} ) {

      const _res = await pallet.uploadDocument( file, { documentType: 'manifest', isRestricted: false } );

      const palletEditDoc = {
        category,
        units: units || quantity,
        numUnitsRemoved,
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