import { type ShippingItem, isPalletSized } from './shipping-item'

export interface HasPackagingType {
  shippingItems?: Array<ShippingItem> | null
  packagingType?: string | null
  setPackagingTypeFromShippingItems?: (this: HasPackagingType) => void
}

export function setPackagingTypeFromShippingItems( this: HasPackagingType ) {

  if( this.shippingItems ) {

    const hasPalletShippingItem = this.shippingItems.some( (shippingItem: ShippingItem) => isPalletSized(shippingItem) )

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
