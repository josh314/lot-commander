import angular from 'angular';

import * as util from '../../utilities';
import * as api from '../../api';

/******************* Listings Service *************************/
angular.module('myApp').factory('ListingsSvc', [ '$q', 'ListingTemplatesSvc', function( $q, ListingTemplatesSvc ) {

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

    getLotListingBodyTemplate: ListingTemplatesSvc.lotListingBody.bind( ListingTemplatesSvc ),

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


/*********************** Listing Templates service */
angular.module('myApp').factory( 'ListingTemplatesSvc', [ function( ) {

  return {
    lotListingBody,
  };

  function lotListingBody( { category, condition, totalUnits, estimatedRetailValue, mostExpensiveItemPrice, isManifested } ) {

    const displayCategory = util.titleCase( category );
    const displayCondition = util.titleCase( condition );

    let guaranteeString;
    switch( condition ) {
      case 'shelf-pull':
      case 'case-packed':
        guaranteeString = `<li> <span>✅ <strong>95% Product Guarantee</strong></span></li>`;
        break;
      case 'salvage':
      case 'customer-returns':
      default:
    }

    let categoryAdditionalCopyString = '';
    switch( category ) {
      case 'personal care':
        categoryAdditionalCopyString = `, from a national drugstore,`;
        break;
      case 'cosmetics':
      case 'general merchandise':
      case 'clothing':
        categoryAdditionalCopyString = `, from a national retail store,`;
        break;
      default:
    }

    let byline1;
    if( totalUnits && estimatedRetailValue ) {
      byline1 = `<p>Lot of ${ totalUnits } products${ categoryAdditionalCopyString } with a total retail value of ${ util.displayAsMoney( estimatedRetailValue ) }.</p>`;
    }
    else if ( totalUnits ) {
      byline1 = `<p>Lot of ${ totalUnits } products${ categoryAdditionalCopyString }.</p>`;
    }
    else if ( estimatedRetailValue ) {
      byline1 = `<p>Lot with a total retail value of ${ util.displayAsMoney( estimatedRetailValue ) }.</p>`;
    }

    let byline2;
    if( totalUnits && estimatedRetailValue ) {
      byline2 = `<li> <span>🔥 <strong>${ totalUnits } Units</strong> valued at <strong>${ util.displayAsMoney( estimatedRetailValue ) }</strong>!</span></li>`;
    }
    else if ( totalUnits ) {
      byline2 = `<li> <span>🔥 <strong>${ totalUnits } Units</strong>!</span></li>`;
    }
    else if ( estimatedRetailValue ) {
      byline2 = `<li> <span>🔥 Valued at <strong>${ util.displayAsMoney( estimatedRetailValue ) }</strong>!</span></li>`;
    }

    return `
      <h3><strong>💥New ${ displayCategory ? `${ displayCategory } ` : ' ' }Lot! 🌟</strong></h3>
      <p><strong>Experience the Excellence of Quality Products</strong></p>
      ${ byline1 || '' }
      <p>You Get the Following:</p>
      <ul style="list-style: none;">
          ${ byline2 || '' }
          ${ isManifested ? `<li> <span>📋 <strong>Product Manifest Available</strong></span></li>` : '' }
          ${ category ? `<li> <span>🛒 <strong>Wide Range of ${ category.toUpperCase() } ITEMS</strong></span></li>` : '' }
          <li> <span>🌟 <strong>Brand Names Included</strong></span></li>
          ${ mostExpensiveItemPrice ? `<li> <span>💰 <strong>Retail Value Per Item</strong>: Up to <strong>${ util.displayAsMoney( mostExpensiveItemPrice ) }</strong></span></li>` : '' }
          ${ displayCondition ? `<li> <span>📦 <strong>Condition</strong>: ${ displayCondition }</span></li>` : '' }
          ${ guaranteeString || '' }
          <li> <span>👍 <strong>Perfect for Resellers!</strong></span></li>
      </ul>
    `;
  }

}]);