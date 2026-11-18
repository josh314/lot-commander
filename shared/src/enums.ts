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

export const categories = [
  'clothing',
  'cosmetics',
  'general merchandise',
  'personal care'
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


export const counterHandles = [
  'pallet-lots',
] as const


export const bundleTypes = [
  'cosmetics',
  'cosmetics__maybelline',
  'cosmetics__loreal',
] as const


export type PackagingType = (typeof packagingTypes)[number]
export type WeightUnit = (typeof weightUnits)[number]
export type LengthUnit = (typeof lengthUnits)[number]
export type Marketplace = (typeof marketplaces)[number]
export type LotStatus = (typeof lotStatuses)[number]
export type LotCategory = (typeof lotCategories)[number]
export type CounterHandle = (typeof counterHandles)[number]
export type Condition = (typeof conditions)[number]
export type Category = (typeof categories)[number]
export type BundleType = (typeof bundleTypes)[number]

/************** App Setting Type System **************
 *
 * Goal is to keep the runtime list of types `appSettingTypeNames` and the union type `AppSettingValue` in sync, in case more types are added in the future.
 *
 * `appSettingTypeNames` is the single runtime source of truth (feeds the mongoose schema's enum: validator).
 *
 * `AppSettingTypeMap` is the one place to add the corresponding TS type per name.
 *
 * `AssertExactKeys` is a conditional type which is `true` when U & T have exactly the same keys, and never otherwise. In the next line, one tries to initialize a variable of type
 * `AssertExactKeys<AppSettingTypeName, keyof AppSettingTypeMap>` with value `true`, which only compiles if the keys match exactly. The void line keeps compiler/linter happy about an unused variable.
 *
 */

export const appSettingTypeNames = [
  'boolean',
  'number',
  'string',
  'date'
] as const
export type AppSettingTypeName = (typeof appSettingTypeNames)[number]

interface AppSettingTypeMap {
  boolean: boolean
  number: number
  string: string
  date: Date
}

export const appSettingTypeGuards: { [K in AppSettingTypeName]: (v: unknown) => v is AppSettingTypeMap[K] } = {
  boolean: (v): v is boolean => typeof v === 'boolean',
  number: (v): v is number => typeof v === 'number',
  string: (v): v is string => typeof v === 'string',
  date: (v): v is Date => v instanceof Date
}

type AssertExactKeys<T, U extends T> = [T] extends [U] ? ([U] extends [T] ? true : never) : never
const _assertAppSettingTypeMapMatchesNames: AssertExactKeys<AppSettingTypeName, keyof AppSettingTypeMap> = true
void _assertAppSettingTypeMapMatchesNames
export type AppSettingValue = AppSettingTypeMap[AppSettingTypeName]

/*************** End App Setting Type System **************/