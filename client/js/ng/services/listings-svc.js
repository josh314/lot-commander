import angular from 'angular';
import dayjs from 'dayjs';

import * as util from '../../utilities';
import * as api from '../../api';

const __MAX_NUM_BRANDS_LISTING_TITLE__ = 3;
const __MAX_NUM_BRANDS_LISTING_BODY__ = 5;

/******************* Listings Service *************************/
angular.module('myApp').factory( 'ListingsSvc', [

  '$q',
  'ListingTemplatesSvc',
  'ProductBundlesSvc',
  'ShippingConfigurationsSvc',

  function(

    $q,
    ListingTemplatesSvc,
    ProductBundlesSvc,
    ShippingConfigurationsSvc,

  ) {

    const productVariantCache = {};

    const getDefaultBoxRate = () => $q.when( api.getDefaultBoxRate( ) );

    async function _getProductVariant( gid ) {

      let pv = productVariantCache[ gid ];

      if( !pv ) {
        const resp = await api.getProductVariant( gid );
        pv = resp.productVariant;
        productVariantCache[ gid ] = pv;
      }

      return pv;

    }

    async function getLotListingTitleTemplate( lot ) {

      const {
        lotNumber,
        packagingType,
        category,
        totalUnits,
        unmanifested,
      } = lot;

      const brands = await lot.getBrandsByMostValue();

      return ListingTemplatesSvc.lotListingTitle( { lotNumber, packagingType, category, brands, totalUnits, isManifested: !unmanifested } );

    }

    async function getLotListingBodyTemplate( lot ) {

      const {
        category,
        type,
        totalUnits,
        estimatedRetailValue,
        unmanifested,
        inventory
      } = lot;

      if( !lot.manifest ) {
        await lot.loadManifestFile();
      }

      let mostExpensiveItemPrice;
      if( lot.manifest ) {
        mostExpensiveItemPrice = lot.manifest.mostExpensiveItemPrice();
      }
      else if ( inventory && inventory.length ) {
        mostExpensiveItemPrice = inventory.reduce( ( _mostExpensiveItemPrice, item ) => item.price && item.price > _mostExpensiveItemPrice ? item.price : _mostExpensiveItemPrice, 0);
      }

      const brands = await lot.getBrandsByMostValue();

      const bodyHtml = ListingTemplatesSvc.lotListingBody( {
        category,
        brands,
        condition: type,
        totalUnits,
        estimatedRetailValue: estimatedRetailValue || lot.getEstimatedRetailValue(),
        mostExpensiveItemPrice,
        isManifested: !unmanifested
      } );

      return bodyHtml;


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
      computeShippingRate: async ( lot ) => {

        let rate = '';

        if( lot.packagingType === 'box lot' ) {

          if( ( lot.shippingItems && lot.shippingItems.length ) || lot.numBoxes ) {

            const numBoxes = ( lot.shippingItems && lot.shippingItems.length ) || lot.numBoxes;

            const defaultBoxRate = (await getDefaultBoxRate()).rate;

            rate = defaultBoxRate * numBoxes;

          }

        }

        return rate;

      },

      editShippingRate: ( gid, newRate ) => $q.when( api.editStoreShippingRate( gid, newRate ) ),

      listShippingRates: qp => $q.when( api.listStoreShippingRates( qp ) ).then( rates =>  {

        return rates.map( _r => Object.assign( {}, _r ) );

      }),

      removeShippingRate: productVariantGid => $q.when( api.removeStoreShippingRate( productVariantGid ) ),

      getDefaultBoxRate,

      setDefaultBoxRate: newRate => $q.when( api.setDefaultBoxRate( newRate ) ),

      getPalletBreakdownServiceRate: () => $q.when( api.getPalletBreakdownServiceRate( ) ),

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

  function getListString( list, maxItems ) {

    let listStr;
    if( Array.isArray( list ) && list.length ) {

      if( list.length === 1 ) {
        listStr = list[0];
      }
      else if ( list.length <= maxItems ) {
        listStr = list.slice( 0, list.length - 1 ).join(', ') + ' and ' + list[ list.length - 1 ];
      }
      else {
        listStr = list.slice( 0, maxItems ).join(', ') + ', and more';
      }

    }

    return listStr;
  }

  function lotListingTitle( { category, brands, totalUnits, isManifested, lotNumber, packagingType } ) {
    const displayCategory = util.titleCase( category );

    const packagingTypeString = packagingType && packagingType.match(/pallet/) ? `Pallet` : `Lot`;

    const brandListStr = getListString( brands, __MAX_NUM_BRANDS_LISTING_TITLE__ );

    return 'New'
      + ( isManifested ? ' Manifested' : '' )
      + ( displayCategory ? ` ${displayCategory}` : '' ) + ' '
      + packagingTypeString
      + ( lotNumber ? ' #' + lotNumber : '' )
      + ( brandListStr ? ` - ${brandListStr}` : '' )
      + ( totalUnits ? ` (${totalUnits} units)` : '' );

  }

  function lotListingBody( { category, brands, condition, totalUnits, estimatedRetailValue, mostExpensiveItemPrice, isManifested } ) {

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

    const brandListStr = getListString( brands, __MAX_NUM_BRANDS_LISTING_BODY__ );

    return `
      <h3><strong>💥New ${ displayCategory ? `${ displayCategory } ` : ' ' }Lot! 🌟</strong></h3>
      <p><strong>Experience the Excellence of Quality Products</strong></p>
      ${ byline1 || '' }
      <p>You Get the Following:</p>
      <ul style="list-style: none;">
          ${ byline2 || '' }
          ${ isManifested ? `<li> <span>📋 <strong>Product Manifest Available</strong></span></li>` : '' }
          ${ category ? `<li> <span>🛒 <strong>Wide Range of ${ category.toUpperCase() } ITEMS</strong></span></li>` : '' }
          ${ brandListStr ? `<li> <span>🌟 <strong>Brand Names Included</strong>: ${ brandListStr }</span></li>` : '' }
          ${ mostExpensiveItemPrice ? `<li> <span>💰 <strong>Retail Value Per Item</strong>: Up to <strong>${ util.displayAsMoney( mostExpensiveItemPrice ) }</strong></span></li>` : '' }
          ${ displayCondition ? `<li> <span>📦 <strong>Condition</strong>: ${ displayCondition }</span></li>` : '' }
          ${ guaranteeString || '' }
          <li> <span>👍 <strong>Perfect for Resellers!</strong></span></li>
      </ul>
    `;
  }

}]);