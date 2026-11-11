import { describe, it, expect } from 'vitest'

import { type HasPackagingType, setPackagingTypeFromShippingItems } from './set-packaging-type-from-shipping-items'
import type { ShippingItem } from './shipping-item'

describe('setPackagingTypeFromShippingItems', () => {


  it('should set packaging type to `boxed lot` as default', () => {

    const item: HasPackagingType = {
      packagingType: undefined,
    }

    item.setPackagingTypeFromShippingItems = setPackagingTypeFromShippingItems

    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('box lot')

    item.shippingItems = []
    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('box lot')

  })

  it('should set packaging type to boxed lot if all items are smaller than pallet', () => {

    const shippingItems: ShippingItem[] = [
      { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' },
    ]

    const item: HasPackagingType = {
      packagingType: undefined,
      shippingItems
    }

    item.setPackagingTypeFromShippingItems = setPackagingTypeFromShippingItems

    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('box lot')

    item.shippingItems = [
      { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' },
      { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' },
    ]
    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('box lot')

  })

  it('should set packaging type to `pallets:bulky` if any item is pallet sized', () => {

    const pallet: ShippingItem = { weight: 2000, weightUnits: 'pounds', height: 60, heightUnits: 'inches', length: 48, lengthUnits: 'inches', width: 48, widthUnits: 'inches' }

    const item: HasPackagingType = {
      packagingType: undefined,
      shippingItems: [pallet]
    }

    item.setPackagingTypeFromShippingItems = setPackagingTypeFromShippingItems

    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('pallets:bulky')

    item.shippingItems = [
      pallet,
      { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' },
    ]
    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('pallets:bulky')

  })

  it('should set packaging type to `pallets` if there are 8 or more items', () => {

    const shippingItem: ShippingItem = { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' }
    const shippingItems: ShippingItem[] = Array<ShippingItem>(7).fill(shippingItem)

    const item: HasPackagingType = {
      packagingType: undefined,
      shippingItems
    }

    item.setPackagingTypeFromShippingItems = setPackagingTypeFromShippingItems

    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('box lot')
    item.shippingItems?.push(shippingItem)
    item.setPackagingTypeFromShippingItems()
    expect(item.packagingType).toBe('pallets')

  })


})