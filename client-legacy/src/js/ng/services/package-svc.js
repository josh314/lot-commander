import angular from 'angular';

import * as api from '../../api';
import * as util from '../../utilities';


/***************************************
 * Helpers
 * =======
 *
 ******/

const queryParams = ( params ) => {

  const qp = Object.assign( {}, params );

  if( qp.populateShipment ) {
    qp.populate_shipment = 1;
    delete qp.populateShipment;
  }

  if( "isInstantiated" in qp ) {

    if( qp.isInstantiated !== null ) {
      qp.is_instantiated = qp.isInstantiated ? 1 : 0;
    }

    delete qp.isInstantiated;
  }

  if( "isFulfilled" in qp ) {

    if( qp.isFulfilled !== null ) {
      qp.is_fulfilled = qp.isFulfilled ? 1 : 0;
    }

    delete qp.isFulfilled;
  }

  if( qp.productUnits ) {

    qp.product = qp.productUnits.productId;

    delete qp.productUnits;
  }

  return qp;
};

function getCategoryFromProductTags( tags ) {

  if( tags ) {

    if( tags.find( t => t.match( /personal care/i ) ) && tags.find( t => t.match( /cosmetics/i ) ) ) {
      return 'personal care w/ cosmetics';
    }
    else if( tags.find( t => t.match( /personal care/i ) ) ) {
      return 'personal care';
    }
    else if( tags.find( t => t.match( /cosmetics/i ) ) ) {
      return 'cosmetics';
    }
    else if( tags.find( t => t.match( /clothing/i ) ) ) {
      return 'clothing';
    }
    else if( tags.find( t => t.match( /general merchandise/i ) ) ) {
      return 'general merchandise';
    }

  }

}

function cmpProductUnitsPackageByDisplayName( a, b ) {
  if( !a ){
    return -1;
  }
  else if( !b ) {
    return +1;
  }
  else {
    return a.displayName < b.displayName ? -1 : +1;
  }
}


/******************* Service for managing packages ***/
angular.module('myApp').factory( 'PackageSvc', [

  '$q',
  'dbEnums',
  'ListingsSvc',
  'PackageListColumns',

  function(
    $q,
    dbEnums,
    ListingsSvc,
    PackageListColumns
  ) {

    return {
      createDuplicatePackages,
      count,
      get,
      instantiate,
      list,
      getProductUnitsPackageOptions,

      getListColumns: columnNames => PackageListColumns( columnNames ),

      // enums
      categoryOptions: [
        '',
        'general merchandise',
        'cosmetics',
        'personal care',
        'personal care w/ cosmetics',
        'clothing'
      ],
      conditionOptions: dbEnums.lotType,

    };

    function get( packageId, { populate = [] } = {} ) {
      return $q.when( api.getPackage( packageId, { populate } ) );
    }

    function createDuplicatePackages( packageData, numPackages, instantiate ) {

      const pkgs = [];

      for( let i=0; i<numPackages; i++ ) {
        pkgs.push( Object.assign( { }, packageData ) );
      }

      return $q.when( api.createPackages( pkgs, instantiate ) );

    }

    function list( { filter, sort, num, page } ) {

      const query = {
        num,
        page
      };

      Object.assign( query, queryParams(filter) );

      if( sort.key ) {
        query.sort = sort.key;
        query.sort_dir = sort.ascending ? 1 : -1;
      }

      return $q.when( api.listPackages( query ) );
    }

    function count( filter ) {
      return $q.when( api.countPackages( queryParams( filter ) ) );
    }

    function instantiate( packageId ) {
      return $q.when( api.instantiatePackage( packageId ) );
    }

    async function getProductUnitsPackageOptions(  ) {

      const configurations = await ListingsSvc.listShippingConfigurations( { everydayBargainsOnly: true } );

      const packageConfigurationMap =  configurations.reduce( ( acc, config ) => {

        const { productTitle, productId, tags, shippingConfiguration } = config;

        if( tags && tags.includes( 'bundle' ) ) {
          return acc;
        }

        if( !shippingConfiguration ) {
          return acc;
        }

        const thisPackageUnitsOptionsSet = new Set( config.shippingConfiguration.map( _ => _.units ) );

        const existingPackage = acc.get( productId );

        let $;
        if( existingPackage ) {

          const existingPackageUnitsOptionsSet = existingPackage.unitsOptionsSet;

          $ = new Set ( [ ...existingPackageUnitsOptionsSet.keys(), ...thisPackageUnitsOptionsSet.keys() ] );

        }
        else {

          $ = thisPackageUnitsOptionsSet;

        }

        acc.set( productId, { productTitle, category: getCategoryFromProductTags( tags ), unitsOptionsSet: $ } );

        return acc;
      }, new Map());

      const productUnitsPackageOptions = [ null ];
      for( let [ productId, value ] of packageConfigurationMap.entries() ) {

        const { productTitle, category, unitsOptionsSet } = value;

        for( let units of unitsOptionsSet.keys() ) {

          let displayName = '';
          if( productTitle && units ) {
            displayName = `${ productTitle } - ${ units }`;
          }
          else if( productTitle ) {
            displayName = productTitle;
          }
          else {
            displayName = `ERROR`;
          }

          productUnitsPackageOptions.push({
            productId,
            displayName,
            productTitle,
            units,
            category,
          });

        }

      }

      return productUnitsPackageOptions.sort( cmpProductUnitsPackageByDisplayName );

    }

  }
]);


angular.module('myApp').factory( 'PackageListColumns', [ function( ) {

  const __COLUMNS__ = {
    _id: {
      optionName: 'Package ID',
      header: 'Package ID',
      permitted: true,
      defaultActive: true,
      // optionAvailable: true,
      noSort: true
    },
    shipment: {
      optionName: 'Shipment',
      header: 'Shipment',
      permitted: true,
      defaultActive: true,
      optionAvailable: true,
      noSort: true
    },
    productTitle: {
      optionName: 'Product',
      header: 'Product',
      permitted: true,
      defaultActive: true,
      optionAvailable: true,
    },
    category: {
      optionName: 'Category',
      header: 'Category',
      defaultSortAscending: true,
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
    condition: {
      optionName: 'Condition',
      header: 'Condition',
      defaultSortAscending: true,
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
    units: {
      optionName: 'Units',
      header: 'Units',
      defaultSortAscending: true,
      permitted: true,
      defaultActive: true,
      optionAvailable: true,
      noSort: true,
    },
    // createdAt: {
    //   optionName: 'Created',
    //   header: 'Created',
    //   defaultSortAscending: false,
    //   transform: util.prettifyDate.bind( util ),
    //   permitted: true,
    //   defaultActive: true,
    //   optionAvailable: true
    // },
    instantiatedDate: {
      optionName: 'Packed',
      header: 'Packed',
      transform: util.prettifyDate.bind( util ),
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
    fulfilledDate: {
      optionName: 'Fulfilled',
      header: 'Fulfilled',
      transform: util.prettifyDate.bind( util ),
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
  };

  function Factory( _columnNames ) {

    const columns = {};

    for( let [ _cname, _cdata ] of Object.entries( __COLUMNS__ ) ) {

      columns[ _cname ] = Object.assign( {}, _cdata );

      if( angular.isArray( _columnNames ) ) {
        columns[ _cname ].active = __COLUMNS__[ _cname ].permitted && _columnNames.includes( _cname );
      }
      else {
        columns[ _cname ].active = __COLUMNS__[ _cname ].permitted && __COLUMNS__[ _cname ].defaultActive;
      }

    }

    return columns;
  }


  return Factory;

}]);
