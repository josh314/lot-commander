export const packagingType = [
  'box lot',
  'pallets',
  'pallets:bulky',
  'pallets:oversized',
  'truckloads'
] as const

export const weightUnits = [
  'pounds',
  'ounces',
  'grams',
  'kilograms'
] as const

export const lengthUnits = [
  'inches',
  'feet',
  'centimeters'
] as const


export const marketplace = [
  'wholesaleninjas'
] as const

export const lotStatus = [
  'In Preparation',
  'Pending Data',
  'Ready',
  'Reviewed',
  'Listed',
  'Sold',
  'Shipped',
  'Error',
  'Decommissioned'
] as const

export const condition = [
  'shelf-pull',
  'case-packed',
  'customer returns',
  'salvage'
] as const

export type PackagingType = (typeof packagingType)[number]
export type WeightUnit = (typeof weightUnits)[number]
export type LengthUnit = (typeof lengthUnits)[number]
export type Marketplace = (typeof marketplace)[number]
export type LotStatus = (typeof lotStatus)[number]
export type Condition = (typeof condition)[number]

