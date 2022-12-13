import angular from 'angular';

import * as api from '../../api';

/******************* Listings Service *************************/
angular.module('myApp').factory('ListingsSvc', [ '$q', function( $q ) {

  const productVariantCache = {};

  async function _getProductVariant( gid ) {

    let pv = productVariantCache[ gid ];

    if( !pv ) {
      const resp = await api.getProductVariant( gid );
      pv = resp.productVariant;
      productVariantCache[ gid ] = pv;
    }

    return pv;

  }

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

    // shipping configs

    listShippingConfigurations: ( { everydayBargainsOnly, includePallets } ) => $q.when( api.listShippingConfigurations( { everydayBargainsOnly, includePallets } ) ),

    getShippingConfiguration: gid => $q.when( api.getShippingConfiguration( gid ) ),

    setShippingConfiguration: ( gid, configuration ) => $q.when( api.setShippingConfiguration( gid, configuration ) ),


    // product bundles

    listProductBundles: () => $q.when( api.listProductBundles() ),

    getProductBundle: gid => $q.when( api.getProductBundle( gid ) ),

    setProductBundle: ( gid, bundle ) => $q.when( api.setProductBundle( gid, bundle ) ),

    // active listings

    getProductVariant: gid => $q.when( _getProductVariant( gid ) ),

    listActiveProducts: ( { everydayBargainsOnly = false, includePallets = true } = {} ) => $q.when( api.listActiveProducts( { everydayBargainsOnly, includePallets } ) ),

    listActiveProductVariants: ( { everydayBargainsOnly = false, includePallets = true } = {} ) => $q.when( api.listActiveProductVariants( { everydayBargainsOnly, includePallets } ) ),

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


/*********************** Listing Shipping Configuration Service */
angular.module('myApp').factory( 'ShippingConfigurationsSvc', [ 'ListingsSvc', 'ShippingItemsSvc', function( ListingsSvc, ShippingItemsSvc ) {

  let configurations;

  function get( gid ) {

    if( !configurations ) {
      return refresh().then( _ => configurations.find( _b => _b.gid === gid ) );
    }

    return Promise.resolve( configurations.find( _b => _b.gid === gid ) );
  }

  function list( { everydayBargainsOnly, includePallets, refreshCache } = {} ) {

    if( refreshCache || !configurations ) {
      return refresh( { everydayBargainsOnly, includePallets } ).then( _ => configurations );
    }

    return Promise.resolve( configurations );
  }

  function refresh( { everydayBargainsOnly, includePallets } = {} ) {

    return ListingsSvc.listShippingConfigurations( { everydayBargainsOnly, includePallets } ).then( resp => {

      configurations = resp.configurations;

      configurations.forEach( _c => _c.shippingConfiguration = _c.shippingConfiguration || [] );

    });

  }

  function set( gid, configuration, refreshCache = true ) {

    let p = ListingsSvc.setShippingConfiguration( gid, configuration );

    if( refreshCache ) {

      p = p.then( refreshCache );

    }

    return p;
  }


  return {

    constants: {
      presets: ShippingItemsSvc.presets,
      lengthUnitsEnum: ShippingItemsSvc.lengthUnitsEnum,
      weightUnitsEnum: ShippingItemsSvc.weightUnitsEnum,
    },

    get,
    list,
    refresh,
    set
  };

}]);
