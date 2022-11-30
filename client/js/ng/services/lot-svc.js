import angular from 'angular';

import * as api from '../../api';

/******************* Service for managing lots ***/
angular.module('myApp').factory( 'LotSvc', [

  '$q',
  '$stateParams',
  'InventoryPallet',
  'lotStore',

  function(
    
    $q,
    $stateParams,
    InventoryPallet,
    lotStore
    
  ) {

    async function _get( lotId, { populate, hydratePallet, hydratePalletNoDocuments } = {} ) {

      const lot = await $q.when( api.getLot( lotId, { populate } ) );

      if( lot && lot.pallet ) {
        if( hydratePallet ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: true } );
        }
        else if( hydratePalletNoDocuments ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: false } );
        }
      }

      return lot;
    }


    async function getLotByHandle( handle, { populate, hydratePallet, hydratePalletNoDocuments } = {} ) {

      const lot = await $q.when( api.getLotByHandle( handle, { populate } ) );

      if( lot && lot.pallet ) {
        if( hydratePallet ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: true } );
        }
        else if( hydratePalletNoDocuments ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: false } );
        }
      }

      return lot;
    }

    return {

      cloneImages: ( lotId, images ) => $q.when( api.cloneImages( lotId, images ) ),

      count: query => $q.when( api.countLots( query ) ),

      create: data => $q.when( api.createLot( data ) ),

      delete: lotId => $q.when( api.deleteLot( lotId ) ),

      edit: ( lotId, data ) => $q.when( api.editLot( lotId, data ) ),

      generateManifest: ( lotId, save, bstock ) => $q.when( api.generateLotManifest( lotId, save, bstock) ),

      get: ( lotId, { populate, hydratePallet } = {} ) => $q.when( _get( lotId, { populate, hydratePallet } ) ),

      getLotByHandle,

      getLotStore: () => lotStore,

      getManifest: manifestId => $q.when( api.getManifest( manifestId ) ),

      import3rdPartyManifestBlock: ( lot, blockId ) => $q.when( api.import3rdPartyManifestBlock({ lot, blockId }) ),

      list: ( { filter, sort, num, page } ) => {

        const query = {
          num,
          page
        };

        Object.assign( query, filter );

        if( sort.key ) {
          query.sort = sort.key;
          query.sort_dir = sort.ascending ? 1 : -1;
        }

        return $q.when( api.listLots( query ) ).then( lots => {
          if( !lots ) {
            return [];
          }

          return lots;

        });
      },

      load: ( { populate } = {} ) => $q.when( _get( $stateParams.lotId, { populate } ).then( async (lot) => {

        lotStore.save( lot );

        if( lot.manifestId ) {

          await $q.when( api.getManifest( lot.manifestId) ).then( manifest => {
            lotStore.setInventory( manifest.inventory );
          });

        }

        return lot;
      }) ),

      saveManifest: () => {
        // This filters out completely empty lines
        lotStore.inventory = lotStore.inventory.filter(item=>{
          if(item.barcode || item.description || item.quantity || item.price) {
            return true;
          }
          return false;
        });

        lotStore.updateTotalUnits();

        return $q.when( api.saveLotManifest( lotStore ) );

      }

    };

  }
]);

