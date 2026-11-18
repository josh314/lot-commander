import { Schema, HydratedDocument, Types } from 'mongoose'
import { shippingItemSchema, type ShippingItem, type ShippingItemArray } from './shipping-item'
import { lotMediaSchema, type LotMedia, type LotMediaArray } from './lot-media'
import { setPackagingTypeFromShippingItems } from './set-packaging-type-from-shipping-items'
import * as enums from '@shared/enums'
import type { PackagingType, Condition, Category } from '@shared/enums'
import { __DEFAULT_PRICE_VALUE_PCT__ } from '../constants'


/*************************************************
 * Split group
 * =============================
 *
 *****/

export interface SplitGroupData {
  label?: string
  description?: string
  labelType?: string
  lotNumber?: number
  category?: Category
  condition?: Condition
  toBeListed?: boolean
  toBeProcessed?: boolean
  isAllocatedForUnmanifestedLots?: boolean
  isMissing?: boolean
  items?: object[]
  packagingType?: PackagingType
  shippingItems: Array<ShippingItem>
  images: Array<LotMedia>
}

interface SplitGroupMethods {
  setPackagingTypeFromShippingItems(): void
}

export type SplitGroup = HydratedDocument<SplitGroupData, SplitGroupMethods> & {
  shippingItems?: ShippingItemArray
  images?: LotMediaArray
}
export type SplitGroupArray = Types.DocumentArray<SplitGroup>

export const splitGroupSchema = new Schema<SplitGroupData, object, SplitGroupMethods>(
  {
    label: String,
    description: String,
    labelType: String,
    lotNumber: Number,
    category: { type: String, enum: enums.categories },
    condition: { type: String, enum: enums.conditions },
    toBeListed: Boolean,
    toBeProcessed: Boolean,
    isAllocatedForUnmanifestedLots: Boolean,
    isMissing: Boolean,
    items: [ Object ],
    packagingType: { type: String, enum: enums.packagingTypes },
    shippingItems: [ shippingItemSchema ],
    images: [ lotMediaSchema ],
  },

  {
    methods: {
      setPackagingTypeFromShippingItems
    }
  }
)

splitGroupSchema.pre( 'validate', function() {

  this.setPackagingTypeFromShippingItems()

  if( !this.category ) {
    this.category = undefined
  }

  if( !this.condition ) {
    this.condition = undefined
  }

} )
