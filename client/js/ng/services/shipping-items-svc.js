import angular from 'angular';

const __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_NUMBER__ = 8;
const __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_PRESET__ = '21x21x21';
const __PALLET_BREAKDOWN_SERVICE_SHIPPING_ITEMS_BOX_WEIGHT_LBS__ = 30;

/***************** Utility Constants and function for Shipping Items ************************/
angular.module('myApp').service('ShippingItemsSvc', [ 'dbEnums', function( dbEnums ){

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

  return {
    //methods
    getPalletBreakdownServiceConfiguration,
    getPreset,

    // constants
    presets,
    lengthUnitsEnum: dbEnums.lengthUnits,
    weightUnitsEnum: dbEnums.weightUnits,
  };

}]);