const packagingTypeEnum = ['box lot', 'pallets', 'pallets:bulky', 'pallets:oversized', 'truckloads'];
const weightUnitsEnum = [ 'pounds', 'ounces', 'grams', 'kilograms' ];
const lengthUnitsEnum = [ 'inches', 'feet', 'centimeters' ];


const marketplaceEnum = [
  // 'bstock',
  'wholesaleninjas'
];
const lotStatusEnum = [ 'In Preparation', 'Ready', 'Listed', 'Sold', 'Shipped', 'Error', 'Decommissioned' ];
const conditionEnum = ['shelf-pull', 'case-packed', 'customer returns', 'salvage'];


module.exports = {

  packagingType: packagingTypeEnum,
  weightUnits: weightUnitsEnum,
  lengthUnits: lengthUnitsEnum,

  lotStatus: lotStatusEnum,
  marketplace: marketplaceEnum,
  condition: conditionEnum,

};

