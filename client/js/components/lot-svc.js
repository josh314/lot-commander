import angular from 'angular';

import * as api from '../api';

/******************* Service for managing lots ***/
angular.module('myApp').factory( 'LotSvc', [ '$q', '$stateParams', 'lotStore',
  function( $q, $stateParams, lotStore ) {

    return {

      cloneImages: ( lotId, images ) => $q.when( api.cloneImages( lotId, images ) ),

      delete: lotId => $q.when( api.deleteLot( lotId ) ),

      edit: ( lotId, data ) => $q.when( api.editLot( lotId, data ) ),

      generateManifest: ( lotId, save, bstock ) => $q.when( api.generateLotManifest( lotId, save, bstock) ),

      getLotStore: () => lotStore,

      getManifest: manifestId => $q.when( api.getManifest( manifestId ) ),

      import3rdPartyManifestBlock: ( lot, blockId ) => $q.when( api.import3rdPartyManifestBlock({ lot, blockId }) ),

      list: query => $q.when( api.listLots( query ) ),

      load: () => $q.when( api.getLot( $stateParams.lotId ) ).then( async (lot) => {

        lotStore.save( lot );

        if( lot.manifestId ) {

          await $q.when( api.getManifest( lot.manifestId) ).then( manifest => {
            lotStore.setInventory( manifest.inventory );
          });

        }

        return lot;
      }),

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

