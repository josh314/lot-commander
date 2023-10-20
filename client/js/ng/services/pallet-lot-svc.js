import angular from 'angular';

import * as api from '../../api';

const lotHandle = ( pallet, lotNumber ) => {

  let res = '';

  if( pallet.shipment && pallet.shipment.handle ) {
    res += `${pallet.shipment.handle}--`;
  }

  res += pallet.handle;

  if( lotNumber ) {
    res += `--${lotNumber}`;
  }

  return res;
};

/******************* Service for creating lots from pallets ***/
angular.module('myApp').factory( 'PalletLotSvc', [ 'CounterSvc', 'InventoryPallet', 'LotSvc', 'ModalSvc', 'ShippingItemsSvc',
  function( CounterSvc, InventoryPallet, LotSvc, ModalSvc, ShippingItemsSvc ) {

    return {
      createLot,
      createLotWithUi,
      lotHandle,
    };

    async function createLotWithUi( pallet, { lotNumber, handle, marketplace, status, packagingType = 'pallets' } = {} ) {

      if( !pallet.isHydrated ) {
        pallet = new InventoryPallet( pallet );
      }
      await pallet.documentsAreLoaded;

      if( !pallet.hasManifest() ) {
        const isConfirmed = await ModalSvc.confirm({
          header: 'Unmanifested pallet',
          body: 'This pallet has no manifest. Proceed anyway?',
        });

        if( !isConfirmed ) {
          return;
        }
      }

      return ModalSvc.wait( {
        waitFor: createLot( pallet, { lotNumber, handle, marketplace, status, packagingType } ),
        delay: 2000
      } );

    }

    // These are just estimated
    function getPackagingTypeShippingItems( packagingType ) {

      if( packagingType === 'pallets' ) { // this is the pallet breakdown service configuration (estimated)

        return ShippingItemsSvc.getPalletBreakdownServiceConfiguration();

      }
      else {
        return [ ShippingItemsSvc.getPreset( 'pallet' ) ];
      }

    }


    async function createLot( pallet, { lotNumber, handle, marketplace, status, packagingType = 'pallets' } = {} ) {

      if( !pallet.isHydrated ) {
        pallet = new InventoryPallet( pallet );
      }
      await pallet.documentsAreLoaded;

      packagingType = pallet.packagingType || packagingType;

      if( !lotNumber ) {
        if( pallet.lotNumber ) {
          lotNumber = pallet.lotNumber;
        }
        else {
          const palletLotCounter = await CounterSvc.incrementPalletLotCounter();
          lotNumber = palletLotCounter.count;
        }
      }

      const handleToSubmit = handle || lotHandle( pallet, lotNumber );

      const existingLot = await LotSvc.getLotByHandle( handleToSubmit );

      if( existingLot ) {

        ModalSvc.message({ header: 'Error', body: `Lot with handle ${handleToSubmit} already exists.`, type: 'error' });
        return;

      }

      const title = pallet.packagingType.match(/pallet/) ? `Pallet #${lotNumber}` : `Lot #${lotNumber}`;

      const _data = {
        handle: handleToSubmit,
        lotNumber,
        pallet: pallet._id,
        listingData: {
          title,
        },
        packagingType,
        category: pallet.category,
        type: pallet.condition,
        shippingItems: pallet.shippingItems || getPackagingTypeShippingItems( packagingType ),
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

      if( pallet.priceValuePercentage ) {
        _data.priceValuePercentage = pallet.priceValuePercentage;
      }

      const resp = await LotSvc.create( _data );

      if( resp.error ) {

        console.error( resp );
        ModalSvc.message({ header: 'Error', body: resp.message, type: 'error' });

      }
      else {
        const lot = resp.lot;

        if( lot && pallet.hasManifest() ) {

          const manifest = pallet.getManifestMetadata();

          const arrayBuffer = await pallet.getDocument( manifest.name );

          const manifestFilename = `pallet-${ lotNumber }.xlsx`;
          const file = new File( [ arrayBuffer ] , manifestFilename );

          await api.uploadLotManifestFile( lot._id, file, manifestFilename );

          if( pallet.images && pallet.images.length ) {

            await LotSvc.addImages( lot._id, pallet.images );

          }

        }

        return lot;
      }

      // TODO: handle error if lot not created. Particular issue is if the auto-generated handle is a dupe

    }

  }
]);