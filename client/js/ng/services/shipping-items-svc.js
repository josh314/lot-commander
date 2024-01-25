import angular from 'angular';

const __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_NUMBER__ = 8;
const __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_PRESET__ = '21x21x21';
const __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_BOX_WEIGHT_LBS__ = 30;

/***************** Utility Constants and function for Shipping Items ************************/
angular.module('myApp').service('ShippingItemsSvc', [ 'dbEnums', 'ServerCodeSvc', function( dbEnums, ServerCodeSvc ){

  const presets = [
    {
      name: '24x18x12',
      weightUnits: dbEnums.weightUnits[0],
      height: 24,
      heightUnits: 'inches',
      length: 18,
      lengthUnits: 'inches',
      width: 12,
      widthUnits: 'inches',
    },
    {
      name: '21x21x21',
      weightUnits: dbEnums.weightUnits[0],
      height: 21,
      heightUnits: 'inches',
      length: 21,
      lengthUnits: 'inches',
      width: 21,
      widthUnits: 'inches',
    },
    {
      name: '16x14x14',
      weightUnits: dbEnums.weightUnits[0],
      height: 16,
      heightUnits: 'inches',
      length: 14,
      lengthUnits: 'inches',
      width: 14,
      widthUnits: 'inches',
    },
    {
      name: '16x14x12',
      weightUnits: dbEnums.weightUnits[0],
      height: 16,
      heightUnits: 'inches',
      length: 14,
      lengthUnits: 'inches',
      width: 12,
      widthUnits: 'inches',
    },
    {
      name: '12x10x6',
      weightUnits: dbEnums.weightUnits[0],
      height: 12,
      heightUnits: 'inches',
      length: 10,
      lengthUnits: 'inches',
      width: 6,
      widthUnits: 'inches',
    },
    {
      name: 'pallet',
      weight: 2000,
      weightUnits: dbEnums.weightUnits[0],
      height: 60,
      heightUnits: 'inches',
      length: 48,
      lengthUnits: 'inches',
      width: 48,
      widthUnits: 'inches',
    }
  ];

  function getPalletBreakdownServiceConfiguration( ) {

    const shippingItems = [];
    for( let i=0; i<__PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_NUMBER__; i++ ) {

      const $_ = getPreset( __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_PRESET__ );
      $_.weight = __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_BOX_WEIGHT_LBS__;

      shippingItems.push( $_ );

    }

    return shippingItems;

  }

  function getPreset( name ) {

    const $_ = presets.find( _p => _p.name === name );

    return JSON.parse( JSON.stringify( $_ ) );
  }

  // this function only passes through the core shippingItem data, stripping out angularJS book-keeping data such as $$hashkey
  function clean( shippingItem ) {

    const {
      _id,
      weight,
      weightUnits,
      height,
      heightUnits,
      length,
      lengthUnits,
      width,
      widthUnits
    } = shippingItem;

    return {
      _id,
      weight,
      weightUnits,
      height,
      heightUnits,
      length,
      lengthUnits,
      width,
      widthUnits
    };

  }

  function compare( a, b ) {
    if( a.weight !== b.weight ) {
      return a.weight < b.weight ? -1 : 1;
    }
    else if( dbEnums.weightUnits.findIndex( _ => _ === a.weightUnits ) !== dbEnums.weightUnits.findIndex( _ => _ === a.weightUnits ) ) {
      return dbEnums.weightUnits.findIndex( _ => _ === a.weightUnits ) < dbEnums.weightUnits.findIndex( _ => _ === a.weightUnits ) ? -1 : 1;
    }
    else if( a.width !== b.width ) {
      return a.width < b.width ? -1 : 1;
    }
    else if( dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) !== dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) ) {
      return dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) < dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) ? -1 : 1;
    }
    else if( a.height !== b.height ) {
      return a.height < b.height ? -1 : 1;
    }
    else if( dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) !== dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) ) {
      return dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) < dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) ? -1 : 1;
    }
    else if( a.length !== b.length ) {
      return a.length < b.length ? -1 : 1;
    }
    else if( dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) !== dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) ) {
      return dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) < dbEnums.lengthUnits.findIndex( _ => _ === a.lengthUnits ) ? -1 : 1;
    }
    else {
      return 1;
    }
  }


  return {
    //methods
    getPalletBreakdownServiceConfiguration,
    getPreset,
    clean,
    compare,
    setPackagingTypeFromShippingItems: ServerCodeSvc.setPackagingTypeFromShippingItems,

    // constants
    presets,
    lengthUnitsEnum: dbEnums.lengthUnits,
    weightUnitsEnum: dbEnums.weightUnits,
  };

}]);