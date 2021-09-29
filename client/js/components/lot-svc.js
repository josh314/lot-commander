import angular from 'angular';

import * as api from '../api';

/******************* Service for managing lots ***/
angular.module('myApp').factory( 'LotSvc', [ '$q', function( $q ) {

  return {

    cloneImages: ( lotId, images ) => $q.when( api.cloneImages( lotId, images ) ),

    delete: lotId => $q.when( api.deleteLot( lotId ) ),

    generateManifest: ( lotId, save, bstock ) => $q.when( api.generateLotManifest( lotId, save, bstock) ),

    getManifest: manifestId => $q.when( api.getManifest( manifestId ) ),

    import3rdPartyManifestBlock: ( lot, blockId ) => $q.when( api.import3rdPartyManifestBlock({ lot, blockId }) ),

    list: query => $q.when( api.listLots( query ) ),

  };

}]);

