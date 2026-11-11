import type { ShippingItem } from './shipping-item'

export interface HasPackagingType {
  shippingItems?: Array<ShippingItem> | null
  packagingType?: string | null
  setPackagingTypeFromShippingItems?: (this: HasPackagingType) => void
}

export function setPackagingTypeFromShippingItems( this: HasPackagingType ) {

  if( this.shippingItems ) {

    const hasPalletShippingItem = this.shippingItems.some( (shippingItem: ShippingItem) => {
      return (shippingItem.weight && shippingItem.weight >= 2000) &&
        shippingItem.weightUnits === 'pounds' &&
        (shippingItem.height && shippingItem.height >= 60) &&
        shippingItem.heightUnits === 'inches' &&
        (shippingItem.width && shippingItem.width >= 48) &&
        shippingItem.widthUnits === 'inches' &&
        (shippingItem.length && shippingItem.length >= 48) &&
        shippingItem.lengthUnits === 'inches'
    } )

    if( hasPalletShippingItem ) {
      this.packagingType = 'pallets:bulky'
    }
    else {

      if( this.shippingItems && this.shippingItems.length >= 8 ) {
        this.packagingType = 'pallets'
      }
      else if ( this.shippingItems && this.shippingItems.length < 8 ) {
        this.packagingType = 'box lot'
      }

    }

  }
  else {
    this.packagingType = 'box lot'
  }

}
