import angular from 'angular';

import * as api from '../../api';

/******************* Service for creating lots from pallets ***/
angular.module('myApp').factory( 'PalletLotSvc', [ 'CounterSvc', 'LotSvc', 'ModalSvc', 'ShippingItemsSvc',
  function( CounterSvc, LotSvc, ModalSvc, ShippingItemsSvc ) {

    return {
      createLot,
      createLotWithUi
    };

    async function createLotWithUi( pallet, { handle, marketplace, status, packagingType = 'pallets' } = {} ) {

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
        waitFor: createLot( pallet, { handle, marketplace, status, packagingType } ),
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


    async function createLot( pallet, { handle, marketplace, status, packagingType = 'pallets' } = {} ) {

      const palletLotCounter = await CounterSvc.incrementPalletLotCounter();

      const handleToSubmit = handle || `${ pallet.shipment && pallet.shipment.handle ? `${pallet.shipment.handle}--` : '' }${pallet.handle}--${palletLotCounter.count}`;

      const existingLot = await LotSvc.getLotByHandle( handleToSubmit );

      if( existingLot ) {

        ModalSvc.message({ header: 'Error', body: `Lot with handle ${handleToSubmit} already exists.`, type: 'error' });
        return;

      }

      const title = `Pallet #${palletLotCounter.count}`;

      const _data = {
        // TODO: estimatedRetailValue (can read this from a standard manifest),
        handle: handleToSubmit,
        pallet: pallet._id,
        listingData: {
          title,
        },
        packagingType: packagingType,
        category: pallet.category,
        type: pallet.condition,
        shippingItems: getPackagingTypeShippingItems( packagingType ),
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

          const manifestFilename = `pallet-${ palletLotCounter.count }.xlsx`;
          const file = new File( [ arrayBuffer ] , manifestFilename );

          await api.uploadLotManifestFile( lot._id, file, manifestFilename );

        }

        return lot;
      }

      // TODO: handle error if lot not created. Particular issue is if the auto-generated handle is a dupe

    }

  }
]);