import angular from 'angular';

import * as api from '../../api';

/******************* Listings Service *************************/
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


    editShippingRate: ( gid, newRate ) => $q.when( api.editStoreShippingRate( gid, newRate ) ),

    getPalletBreakdownServiceRate: () => $q.when( api.getPalletBreakdownServiceRate( ) ),

    listShippingRates: qp => $q.when( api.listStoreShippingRates( qp ) ).then( rates =>  {

      return rates.map( _r => Object.assign( {}, _r ) );

    }),

    removeShippingRate: productVariantGid => $q.when( api.removeStoreShippingRate( productVariantGid ) ),

    setPalletBreakdownServiceRate: newRate => $q.when( api.setPalletBreakdownServiceRate( newRate ) ),

    submitLotListing: ( lotId, listingData, publish = false ) => $q.when( api.submitLotListing( lotId, listingData, publish ) ),

  };

}]);