import { Schema, InferSchemaType } from 'mongoose'
import { weightUnits, lengthUnits } from '@shared/enums'

/*******************************
 * ShippingItemSchema schema
 * =============================
 *
 ******/

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
        return this.weight === 2000 &&
              this.weightUnits === 'pounds' &&
              this.height === 60 &&
              this.heightUnits === 'inches' &&
              this.width === 48 &&
              this.widthUnits === 'inches' &&
              this.length === 48 &&
              this.lengthUnits === 'inches'
      }
    }
  }

)

export type ShippingItem = InferSchemaType<typeof shippingItemSchema>

interface EntityWithShippingItemsAndPackagingType {
  shippingItems?: Array<ShippingItem>
  packagingType?: string
}

export function setPackagingTypeFromShippingItems( $_: EntityWithShippingItemsAndPackagingType ) {

  if( $_.shippingItems ) {

    const hasPalletShippingItem = $_.shippingItems.some( (shippingItem: ShippingItem) => {
      return shippingItem.weight === 2000 &&
        shippingItem.weightUnits === 'pounds' &&
        shippingItem.height === 60 &&
        shippingItem.heightUnits === 'inches' &&
        shippingItem.width === 48 &&
        shippingItem.widthUnits === 'inches' &&
        shippingItem.length === 48 &&
        shippingItem.lengthUnits === 'inches'
    } )

    if( hasPalletShippingItem ) {
      $_.packagingType = 'pallets:bulky'
    }
    else {

      if( $_.shippingItems && $_.shippingItems.length >= 8 ) {
        $_.packagingType = 'pallets'
      }
      else if ( $_.shippingItems && $_.shippingItems.length < 8 ) {
        $_.packagingType = 'box lot'
      }

    }

  }
  else {
    $_.packagingType = 'box lot'
  }

}
