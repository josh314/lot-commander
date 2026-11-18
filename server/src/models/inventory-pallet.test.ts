import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Connection,
  createConnection,
} from 'mongoose'

import { inventoryPalletSchema, type InventoryPalletData, type InventoryPalletModel } from './inventory-pallet'
import { __DEFAULT_PRICE_VALUE_PCT__ } from '../constants'

let mongod: MongoMemoryServer
let connection: Connection
let InventoryPallet: InventoryPalletModel

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  InventoryPallet = connection.model<InventoryPalletData, InventoryPalletModel>('InventoryPallet', inventoryPalletSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('InventoryPallet model initialization', () => {
  it('No required fields', async () => {
    const pallet = new InventoryPallet({})

    const getSpy = vi.spyOn(pallet, 'save')

    await pallet.save()
    expect(getSpy).toHaveResolved()
  })

  it('Default values', () => {
    const pallet = new InventoryPallet({})
    expect(pallet.hasProblem).toBe(false)
    expect(pallet.isAnonymous).toBe(false)
    expect(pallet.toBeListed).toBe(false)
    expect(pallet.toBeProcessed).toBe(false)
    expect(pallet.isAllocatedForUnmanifestedLots).toBe(false)
    expect(pallet.isMissing).toBe(false)
    expect(pallet.isRepacked).toBe(false)
    expect(pallet.isBrokendown).toBe(false)
    expect(pallet.isReceived).toBe(false)
    expect(pallet.isDeleted).toBe(false)
  })
})

describe('setPackagingTypeFromShippingItems', () => {

  it('method wired correctly', () => {
    const pallet = new InventoryPallet({
      shippingItems: [
        { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' }
      ]
    })
    pallet.setPackagingTypeFromShippingItems()
    expect(pallet.packagingType).toBe('box lot')
  })

})

describe('pre-validate hook', () => {

  it('sets packagingType for pallet', async () => {
    const pallet = new InventoryPallet({
      shippingItems: [
        { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' }
      ]
    })
    await pallet.validate()
    expect(pallet.packagingType).toBe('box lot')
  })

  it('Falsey strings are undefined', async () => {
    const pallet = new InventoryPallet({
      condition: '',
      category: ''
    })
    await pallet.validate()
    expect(pallet.category).toBe(undefined)
    expect(pallet.condition).toBe(undefined)
  })
})

describe('pre-save hook', () => {
  it('sets default price value if not provided', async () => {
    const pallet = new InventoryPallet({})
    await pallet.save()
    expect(pallet.priceValuePercentage).toBe(__DEFAULT_PRICE_VALUE_PCT__)
  })

  it('Falsey strings are undefined', async () => {
    const pallet = new InventoryPallet({
      handle: '',
      note: ''
    })
    await pallet.save()
    expect(pallet.handle).toBe(undefined)
    expect(pallet.note).toBe(undefined)
  })
})

describe('splitGroup pre-validation hook', () => {

  it('sets packagingType for pallet splitGroups', async () => {
    const pallet = new InventoryPallet({
      splitGroups: [{
        shippingItems: [
          { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' }
        ]
      }]
    })
    await pallet.save()
    expect(pallet.splitGroups[0]?.packagingType).toBe('box lot')
  })

  it('Falsey strings are undefined', async () => {
    const pallet = new InventoryPallet({
      splitGroups: [{
        condition: '',
        category: ''
      }]
    })
    await pallet.validate()
    expect(pallet.splitGroups[0]?.category).toBe(undefined)
    expect(pallet.splitGroups[0]?.condition).toBe(undefined)
  })

})
