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

    // shipping rates

    editShippingRate: ( gid, newRate ) => $q.when( api.editStoreShippingRate( gid, newRate ) ),

    getPalletBreakdownServiceRate: () => $q.when( api.getPalletBreakdownServiceRate( ) ),

    listShippingRates: qp => $q.when( api.listStoreShippingRates( qp ) ).then( rates =>  {

      return rates.map( _r => Object.assign( {}, _r ) );

    }),

    removeShippingRate: productVariantGid => $q.when( api.removeStoreShippingRate( productVariantGid ) ),

    setPalletBreakdownServiceRate: newRate => $q.when( api.setPalletBreakdownServiceRate( newRate ) ),

    // submission

    submitLotListing: ( lotId, listingData, publish = false ) => $q.when( api.submitLotListing( lotId, listingData, publish ) ),

    // product bundles

    listProductBundles: () => $q.when( api.listProductBundles() ),

    getProductBundle: gid => $q.when( api.getProductBundle( gid ) ),

    setProductBundle: ( gid, bundle ) => $q.when( api.setProductBundle( gid, bundle ) ),

    // active listings

    listActiveProducts: ( { everydayBargainsOnly = false} = {} ) => $q.when( api.listActiveProducts( { everydayBargainsOnly } ) ),

  };

}]);

/*********************** Product Bundle Service */
angular.module('myApp').factory( 'ProductBundlesSvc', [ 'ListingsSvc', function( ListingsSvc ) {

  let bundles;

  function get( gid ) {

    if( !bundles ) {
      return refresh().then( _ => bundles.find( _b => _b.gid === gid ) );
    }

    return Promise.resolve( bundles.find( _b => _b.gid === gid ) );
  }

  function list() {

    if( !bundles ) {
      return refresh().then( _ => bundles );
    }

    return Promise.resolve( bundles );
  }

  function refresh() {

    return ListingsSvc.listProductBundles().then( resp => bundles = resp.bundles );

  }

  function set( gid, bundle ) {
    return ListingsSvc.setProductBundle( gid, bundle ).then( refresh );
  }


  return {
    get,
    list,
    refresh,
    set
  };

}]);
