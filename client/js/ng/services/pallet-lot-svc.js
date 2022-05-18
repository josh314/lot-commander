import angular from 'angular';

import * as api from '../../api';

/******************* Service for creating lots from pallets ***/
angular.module('myApp').factory( 'PalletLotSvc', [ 'LotSvc', 'ShippingItemsSvc',
  function( LotSvc, ShippingItemsSvc ) {

    return {
      createLot
    };

    async function createLot( pallet, { handle, marketplace, status, packagingType } = {} ) {

      // TODO: check the title for dupes
      const handleToSubmit = handle || `${ pallet.shipment && pallet.shipment.handle ? `${pallet.shipment.handle} - ` : '' }${pallet.handle}`;

      const existingLot = await LotSvc.getLotByHandle( handleToSubmit );

      if( existingLot ) {
        throw new Error(`Lot with handle '${handleToSubmit}' already exists.`);
      }

      const title = `Pallet ${pallet.handle}`;

      const _data = {
        // TODO: estimatedRetailValue (can read this from a standard manifest),
        handle: handleToSubmit,
        pallet: pallet._id,
        listingData: {
          title,
        },
        packagingType: packagingType || 'pallets:bulky',
        category: pallet.category,
        type: pallet.condition,
        shippingItems: [ ShippingItemsSvc.getPreset( 'pallet' ) ],
        unmanifested: !pallet.hasManifest(),
        destinationMarketplace: marketplace || 'wholesaleninjas',
        status
      };

      if( pallet.units ) {
        _data.totalUnits = pallet.units;
      }

      if( pallet.retailValue ) {
        _data.estimatedRetailValue = pallet.retailValue;
      }

      const lot = await LotSvc.create( _data );

      if( lot && pallet.hasManifest() ) {

        const manifest = pallet.getManifestMetadata();

        const arrayBuffer = await pallet.getDocument( manifest.name );
        
        const file = new File( [ arrayBuffer ] , manifest.name );
        
        await api.uploadLotManifestFile( lot._id, file );

      }

      return lot;

      // TODO: handle error if lot not created. Particular issue is if the auto-generated handle is a dupe

    }

  }
]);