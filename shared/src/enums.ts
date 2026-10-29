export const packagingTypes = [
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


export const marketplaces = [
  'wholesaleninjas'
] as const

export const lotStatuses = [
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

export const lotCategories = [
  {
    key: 'clothing',
    category: 'clothing',
    prefix: 'AP',
    displayName: 'Apparel'
  },
  {
    key: 'cosmetics',
    category: 'cosmetics',
    prefix: 'CS',
    displayName: 'Cosmetics'
  },
  {
    key: 'general-merchandise',
    category: 'general merchandise',
    prefix: 'GM',
    displayName: 'General Merchandise'
  },
  {
    key: 'nail-polish',
    category: 'cosmetics',
    prefix: 'NP',
    displayName: 'Nail Polish'
  },
  {
    key: 'personal-care',
    category: 'personal care',
    prefix: 'PC',
    displayName: 'Personal Care'
  },
  {
    key: 'vitamins-supplements',
    category: 'personal care',
    prefix: 'VT',
    displayName: 'Vitamins & Supplements'
  },
] as const

export const conditions = [
  'shelf-pull',
  'case-packed',
  'customer returns',
  'salvage'
] as const

export type PackagingType = (typeof packagingTypes)[number]
export type WeightUnit = (typeof weightUnits)[number]
export type LengthUnit = (typeof lengthUnits)[number]
export type Marketplace = (typeof marketplaces)[number]
export type LotStatus = (typeof lotStatuses)[number]
export type LotCategory = (typeof lotCategories)[number]
export type Condition = (typeof conditions)[number]