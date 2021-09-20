import angular from 'angular';

import * as api from '../api';

/****************** Load lot *****************************/
// Service for loading lot data into the client from the remote DB
angular.module('myApp').service( 'loadLot', [ '$q', '$stateParams', 'lotStore',

  function( $q, $stateParams, lotStore ){

    return function() {
      return $q.when( api.getLot( $stateParams.lotId ) ).then( lot =>{

        lotStore.save(lot);

        let manP;
        if(lot.manifestId) {

          manP = $q.when( api.getManifest( lot.manifestId) ).then( manifest => {
            lotStore.setInventory( manifest.inventory );
          });

        }
        else {
          manP = $q.when( null );
        }

        return manP.then( _ => lot );
      });
    };

  }

]);