import { Schema, InferSchemaType, Types } from 'mongoose'
import { weightUnits, lengthUnits } from '@shared/enums'

/*******************************
 * ShippingItemSchema schema
 * =============================
 *
 ******/

export interface ShippingItemData {
  weight?: number | null
  weightUnits?: string | null
  height?: number | null
  heightUnits?: string | null
  width?: number | null
  widthUnits?: string | null
  length?: number | null
  lengthUnits?: string | null
}

export type ShippingItemMethods = {
  isPallet: () => boolean
}

export function isPalletSized(item: ShippingItemData): boolean {
  return item.weight === 2000 &&
         item.weightUnits === 'pounds' &&
         item.height === 60 &&
         item.heightUnits === 'inches' &&
         item.width === 48 &&
         item.widthUnits === 'inches' &&
         item.length === 48 &&
         item.lengthUnits === 'inches'
}

export const shippingItemSchema = new Schema(

  {
    weight: Number,
    weightUnits: { type: String, enum: weightUnits },
    height: Number,
    heightUnits: { type: String, enum: lengthUnits },
    width: Number,
    widthUnits: { type: String, enum: lengthUnits },
    length: Number,
    lengthUnits: { type: String, enum: lengthUnits },
  },

  {
    methods: {
      isPallet: function() {
        return isPalletSized(this)
      }
    }
  }

)

export type ShippingItem = InferSchemaType<typeof shippingItemSchema>
export type ShippingItemArray = Types.DocumentArray<ShippingItem>
