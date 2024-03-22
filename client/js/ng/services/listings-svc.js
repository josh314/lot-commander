import angular from 'angular';
import dayjs from 'dayjs';

import * as util from '../../utilities';
import * as api from '../../api';

const __SHIPPING_RATE_FIRST_BOX__ = 30;
const __SHIPPING_RATE_MINIMUM_PER_BOX__ = 15;
const __SHIPPING_RATE_DISCOUNT_FACTOR_PER_BOX__ = 0.05;

/******************* Listings Service *************************/
angular.module('myApp').factory( 'ListingsSvc', [

  '$q',
  'ListingTemplatesSvc',
  'LotSvc',
  'ProductBundlesSvc',
  'ShippingConfigurationsSvc',

  function(

    $q,
    ListingTemplatesSvc,
    LotSvc,
    ProductBundlesSvc,
    ShippingConfigurationsSvc,

  ) {

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

    function getLotListingTitleTemplate( lot ) {

      const {
        lotNumber,
        packagingType,
        category,
        totalUnits,
        unmanifested,
      } = lot;

      return ListingTemplatesSvc.lotListingTitle( { lotNumber, packagingType, category, totalUnits, isManifested: !unmanifested } );

    }

    function getLotListingBodyTemplate( lot ) {

      const {
        _id,
        category,
        type,
        totalUnits,
        estimatedRetailValue,
        unmanifested,
        manifestFileLocation,
        inventory
      } = lot;

      const loadManifestP = manifestFileLocation ? LotSvc.loadManifestFile( _id ) : Promise.resolve( undefined );

      return loadManifestP.then( manifest => {

        let mostExpensiveItemPrice;
        if( manifest ) {
          mostExpensiveItemPrice = manifest.mostExpensiveItemPrice();
        }
        else if ( inventory && inventory.length ) {
          mostExpensiveItemPrice = inventory.reduce( ( _mostExpensiveItemPrice, item ) => item.price && item.price > _mostExpensiveItemPrice ? item.price : _mostExpensiveItemPrice, 0);
        }

        const bodyHtml = ListingTemplatesSvc.lotListingBody( {
          category,
          condition: type,
          totalUnits,
          estimatedRetailValue: estimatedRetailValue || lot.getEstimatedRetailValue(),
          mostExpensiveItemPrice,
          isManifested: !unmanifested
        } );

        return bodyHtml;

      });

    }

    return {

      getLotListingTitleTemplate,
      getLotListingBodyTemplate,

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
      computeShippingRate: lot => {

        let rate = '';

        if( lot.packagingType === 'box lot' ) {

          if( ( lot.shippingItems && lot.shippingItems.length ) || lot.numBoxes ) {

            const numBoxes = ( lot.shippingItems && lot.shippingItems.length ) || lot.numBoxes;

            rate = 0;
            for( let i=0; i<numBoxes; i++ ) {
              let itemRate = __SHIPPING_RATE_FIRST_BOX__ * ( 1 -  i * __SHIPPING_RATE_DISCOUNT_FACTOR_PER_BOX__ );

              if( itemRate < __SHIPPING_RATE_MINIMUM_PER_BOX__ ) {
                itemRate = __SHIPPING_RATE_MINIMUM_PER_BOX__;
              }

              rate += itemRate;
            }

          }

        }

        return rate;

      },

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

      listShippingConfigurations: ShippingConfigurationsSvc.list.bind( ShippingConfigurationsSvc ),

      getShippingConfiguration: ShippingConfigurationsSvc.get.bind( ShippingConfigurationsSvc ),

      setShippingConfiguration: ShippingConfigurationsSvc.set.bind( ShippingConfigurationsSvc ),


      // product bundles

      listProductBundles: ProductBundlesSvc.list.bind( ProductBundlesSvc ),

      getProductBundle: ProductBundlesSvc.get.bind( ProductBundlesSvc ),

      setProductBundle: ProductBundlesSvc.set.bind( ProductBundlesSvc ),

      // active listings

      getProductVariant: gid => $q.when( _getProductVariant( gid ) ),

      listActiveProducts: ( { everydayBargainsOnly = false, includePallets = true } = {} ) => $q.when( api.listActiveProducts( { everydayBargainsOnly, includePallets } ) ),

      listActiveProductVariants: ( { everydayBargainsOnly = false, includePallets = true } = {} ) => $q.when( api.listActiveProductVariants( { everydayBargainsOnly, includePallets } ) ),

    };

  }
]);

/*********************** Product Bundle Service */
angular.module('myApp').factory( 'ProductBundlesSvc', [ '$localStorage', '$q', function( $localStorage, $q, ) {

  function init() {
    const cache = getCache();

    return cache ? Promise.resolve( cache ) : refresh();

  }

  function getCache() {

    const cache = $localStorage[ 'ProductBundlesSvcCache' ];
    if( cache && cache.ttl && dayjs() < dayjs( cache.ttl ) ) {
      return cache.bundles;
    }

  }

  function updateCache( bundles ) {

    $localStorage[ 'ProductBundlesSvcCache' ] = {
      bundles,
      ttl: dayjs().add( 1, 'hours' )
    };

    console.log('Refreshed ProductBundlesSvc cache:');
    console.log( $localStorage[ 'ProductBundlesSvcCache' ] );

  }

  function get( gid ) {

    const cache = getCache();

    if( !cache ) {
      return refresh().then( _ => getCache().find( _b => _b.gid === gid ) );
    }

    return Promise.resolve( cache.find( _b => _b.gid === gid ) );
  }

  function list() {

    if( !getCache() ) {
      return refresh().then( _ => getCache() );
    }

    return Promise.resolve( getCache() );
  }

  function refresh() {

    return $q.when( api.listProductBundles() ).then( resp => updateCache( resp.bundles ) );

  }

  function set( gid, bundle ) {

    return $q.when( api.setProductBundle( gid, bundle ) ).then( _ => {

      const bundles = getCache();

      if( bundles ) {

        const foundIndex = bundles.findIndex( _b => _b.gid === gid );

        if( foundIndex > -1 ) {

          bundles[ foundIndex ].bundle = bundle;

          updateCache( bundles );

        }

      }
      else {
        return refresh();
      }

    } );
  }


  return {
    init,
    get,
    list,
    refresh,
    set
  };

}]);


/*********************** Listing Shipping Configuration Service */
angular.module('myApp').factory( 'ShippingConfigurationsSvc', [ '$localStorage', '$q', 'ShippingItemsSvc', function( $localStorage, $q, ShippingItemsSvc ) {

  function init() {

    const cache = getCache();

    return cache ? Promise.resolve( cache ) : refresh();

  }

  function getCache() {

    const cache = $localStorage[ 'ShippingConfigurationsSvcCache' ];
    if( cache && cache.ttl && dayjs() < dayjs( cache.ttl ) ) {
      return cache.configurations;
    }

  }

  function updateCache( configurations ) {

    $localStorage[ 'ShippingConfigurationsSvcCache' ] = {
      configurations,
      ttl: dayjs().add( 1, 'hours' )
    };

    console.log('Refreshed ShippingConfigurationsSvc cache:');
    console.log( $localStorage[ 'ShippingConfigurationsSvcCache' ] );

  }

  function get( gid ) {

    const cache = getCache();

    if( !cache ) {
      return refresh().then( _ => getCache().find( _b => _b.gid === gid ) );
    }

    return Promise.resolve( cache.find( _b => _b.gid === gid ) );
  }

  function list() {

    if( !getCache() ) {
      return refresh().then( _ => getCache() );
    }

    return Promise.resolve( getCache() );

  }

  function refresh() {

    return $q.when( api.listShippingConfigurations( { everydayBargainsOnly: true, includePallets: true } ) ).then( resp => updateCache( resp.configurations ) );

  }

  function set( gid, configuration ) {

    return $q.when( api.setShippingConfiguration( gid, configuration ) ).then( _ => {

      const configurations = getCache();

      if( configurations ) {

        const foundIndex = configurations.findIndex( _b => _b.gid === gid );

        if( foundIndex > -1 ) {

          configurations[ foundIndex ].shippingConfiguration = configuration;

          updateCache( configurations );

        }

      }
      else {
        return refresh();
      }

    } );

  }


  return {

    constants: {
      presets: ShippingItemsSvc.presets,
      lengthUnitsEnum: ShippingItemsSvc.lengthUnitsEnum,
      weightUnitsEnum: ShippingItemsSvc.weightUnitsEnum,
    },

    init,
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
    lotListingTitle,
  };

  function lotListingTitle( { category, totalUnits, isManifested, lotNumber, packagingType } ) {
    const displayCategory = util.titleCase( category );

    const packagingTypeString = packagingType && packagingType.match(/pallet/) ? `Pallet` : `Lot`;

    return `New${ isManifested ? ' Manifested' : '' }${ displayCategory ? ` ${displayCategory}` : ''} ${packagingTypeString}${ lotNumber ? ' #' + lotNumber : '' }${ totalUnits ? ` (${totalUnits} units)` : '' }`;
  }

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