import angular from 'angular';

import * as api from '../../api';

/******************* Listings Controller *************************/
angular.module('myApp').factory('ListingsSvc', [ '$q', function( $q ) {

  return {

    isTitleTooLong: title => {
      const res = {
        bstock: false,
        shopify: false,
      };

      if(title && title.length >= 68) {
        res.bstock = true;
      }
      if(title && title.length >= 96) {
        res.shopify = true;
      }
      return res;
    },

    submitLotListing: ( lotId, listingData, publish = false ) => $q.when( api.submitLotListing( lotId, listingData, publish ) ),

  };

}]);