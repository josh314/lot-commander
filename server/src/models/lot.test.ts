import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Types,
  Connection,
  createConnection,
} from 'mongoose'

import * as enums from '@shared/enums'
import type { ILotMediaData } from './lot-media-data'
import { lotSchema, type ILot, type LotModelType, type MediaType } from './lot'
import { ChildResourceNotFoundError, IllegalActionError } from '../errors'

let mongod: MongoMemoryServer
let connection: Connection
let Lot: LotModelType

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  Lot = connection.model<ILot, LotModelType>('Lot', lotSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('Lot model initialization', () => {

  it('Throws when handle is not provided', async () => {
    const lot = new Lot({})
    await expect(lot.save()).rejects.toThrow()
  })

  it('Testing default status', () => {
    const lot = new Lot({
      handle: 'test-handle',
    })
    expect(lot.handle).toBe('test-handle')
    expect(lot.status).toBe( enums.lotStatuses[0] )
  })


  it('Throws when status is not valid', async () => {
    const lot = new Lot({
      handle: 'test-handle',
      status: 'InvalidStatus'
    })
    await expect(lot.save()).rejects.toThrow()
  })

  it('Array fields have empty arrays by default', () => {
    const lot = new Lot({
      handle: 'test-handle',
    })
    expect(lot.submittedListings).toEqual([])
    expect(lot.images).toEqual([])
    expect(lot.videos).toEqual([])
    expect(lot.thirdPartyManifests).toEqual([])
    expect(lot.shippingItems).toEqual([])
  })

  it('saves to db correctly', async () => {
    const lot = new Lot({
      handle: 'test-handle',
    })
    const savedLot = await lot.save()
    expect(savedLot).not.toBeNull()
    expect(savedLot.handle).toBe('test-handle')
  })

})

describe('setPackagingTypeFromShippingItems', () => {

  it('method wired correctly', () => {
    const lot = new Lot({
      handle: 'test-handle',
      shippingItems: [
        { weight: 4, weightUnits: 'pounds', height: 12, heightUnits: 'inches', length: 12, lengthUnits: 'inches', width: 12, widthUnits: 'inches' }
      ]
    })
    lot.setPackagingTypeFromShippingItems()
    expect(lot.packagingType).toBe('box lot')
  })

})

describe('getMediaArray', () =>{
  // This actually tests something prevented by the type of this method's argument but we will
  // keep this test until the entire server is safely typed
  it('throws on invalid media type', () => {
    const lot = new Lot({
      handle: 'test-handle',
    })
    expect(() => lot.getMediaArray('invalidType' as MediaType)).toThrow(IllegalActionError)
  })
})

describe('getMedia', () => {

  const images = [
    {
      _id: new Types.ObjectId(),
      s3: 's3://bucket/image1.jpg',
      primary: false,
      isProcessing: false
    },
    {
      _id: new Types.ObjectId(),
      s3: 's3://bucket/image2.jpg',
      primary: false,
      isProcessing: false
    }
  ]

  it('retrieves the correct media item by ObjectId', () => {
    const lot = new Lot({
      handle: 'test-handle',
      images
    })
    const media2 = lot.getMedia(images[1]._id, 'images')
    expect(media2?.s3).toBe(images[1].s3)
  })


  it('retrieves the correct media item by string of ObjectId', () => {
    const lot = new Lot({
      handle: 'test-handle',
      images
    })
    const media2 = lot.getMedia(images[1]._id.toString(), 'images')
    expect(media2?.s3).toBe(images[1].s3)
  })

})

describe('addMedia', () => {

  const img = { s3: 's3://bucket/image1.jpg', primary: false, isProcessing: false }

  it('item added correctly', async () => {
    const lot = new Lot({
      handle: 'test-handle',
    })

    await lot.addMedia(img, 'images', { save: false} )
    expect(lot.images.length).toBe(1)
  })

  it('saves to db by default', async () => {
    const lot = new Lot({
      handle: 'test-handle',
    })
    await lot.addMedia(img, 'images')
    const savedLot = await Lot.findById(lot._id)
    expect(savedLot).not.toBeNull()
    expect(savedLot!.images.length).toBe(1)
    expect(savedLot!.images[0].s3).toBe(img.s3)
  })

  it('does not save to db when save option is false', async () => {
    const lot = new Lot({
      handle: 'test-handle',
    })
    await lot.save()

    await lot.addMedia(img, 'images', { save: false })
    const savedLot = await Lot.findById(lot._id)
    expect(lot.images.length).toBe(1)
    expect(savedLot!.images.length).toBe(0)
  })
})

describe('removeMedia', () => {

  const imageId = new Types.ObjectId()
  const img = {
    _id: imageId,
    s3: 's3://bucket/image1.jpg',
    primary: false,
    isProcessing: false
  }

  it('removes the media item correctly', async () => {

    const lot = new Lot({
      handle: 'test-handle',
      images: [
        img
      ]
    })

    await lot.removeMedia(imageId, 'images', { save: false })
    expect(lot.images.length).toBe(0)
  })

  it('correctly saves by default', async () => {
    const lot = new Lot({
      handle: 'test-handle',
      images: [ img ],
      primary: false
    })
    await lot.save()

    let savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images.length).toBe(1)

    await lot.removeMedia(imageId, 'images')

    savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images.length).toBe(0)

  })

  it(`doesn't save when option is set to false`, async () => {
    const lot = new Lot({
      handle: 'test-handle',
      images: [ img ],
      primary: false
    })
    await lot.save()

    let savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images.length).toBe(1)

    await lot.removeMedia(imageId, 'images', { save: false })

    savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images.length).toBe(1)
  })


  it('throws ChildResourceNotFoundError when media item is not found', () => {
    const lot = new Lot({
      handle: 'test-handle',
      images: [],
    })
    const nonexistentId = new Types.ObjectId()
    expect(() => lot.removeMedia( nonexistentId , 'images')).toThrow(ChildResourceNotFoundError)
    expect(() => lot.removeMedia( nonexistentId.toString() , 'images')).toThrow(ChildResourceNotFoundError)

  })

})

describe('setPrimaryMedia', () => {

  const img: ILotMediaData = {
    s3: 's3://bucket/image1.jpg',
    primary: false,
    isProcessing: false
  }

  it('sets the primary media correctly', async () => {
    const lot = new Lot({
      handle: 'test-handle',
      images: [ img ],
      primary: false
    })
    const imageId = lot.images[0]._id;

    await lot.setPrimaryMedia(imageId.toString(), 'images', { save: false })
    expect(lot.images[0].primary).toBe(true)
  })

  it('is idempotent', async () => {
    const lot = new Lot({
      handle: 'test-handle',
      images: [ img ],
      primary: false
    })

    const imageId = lot.images[0]._id;
    await lot.setPrimaryMedia(imageId.toString(), 'images', { save: false })
    expect(lot.images[0].primary).toBe(true)

    // Call it again to ensure idempotency
    await lot.setPrimaryMedia(imageId.toString(), 'images', { save: false })
    expect(lot.images[0].primary).toBe(true)
  })

  it('unsets the previous primary media correctly', async () => {
    const lot = new Lot({
      handle: 'test-handle',
      images: [ { ...img, primary: true }, img ],
      primary: false
    })

    const newPrimaryId = lot.images[1]._id;
    await lot.setPrimaryMedia(newPrimaryId.toString(), 'images', { save: false })
    expect(lot.images[0].primary).toBe(false)
    expect(lot.images[1].primary).toBe(true)
  })

  it('throws ChildResourceNotFoundError when media item is not found', () => {
    const lot = new Lot({
      handle: 'test-handle',
      images: [ img ]
    })
    const nonexistentId = new Types.ObjectId()
    expect(() => lot.setPrimaryMedia( nonexistentId , 'images', { save: false })).toThrow(ChildResourceNotFoundError)
    expect(() => lot.setPrimaryMedia( nonexistentId.toString() , 'images', { save: false })).toThrow(ChildResourceNotFoundError)
  })

  it('correctly saves by default', async () => {

    const imageId = new Types.ObjectId()

    const lot = new Lot({
      handle: 'test-handle',
      images: [ {
        _id: imageId,
        ...img
      } ],
      primary: false
    })
    await lot.save()

    let savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images[0].primary).toBe(false)

    await lot.setPrimaryMedia(imageId, 'images')

    savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images[0].primary).toBe(true)
  })

  it(`doesn't save when option is set to false`, async () => {

    const imageId = new Types.ObjectId()

    const lot = new Lot({
      handle: 'test-handle',
      images: [ {
        _id: imageId,
        ...img
      } ],
      primary: false
    })
    await lot.save()

    let savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images[0].primary).toBe(false)

    await lot.setPrimaryMedia(imageId, 'images', { save: false })

    savedLot = await Lot.findById(lot._id)
    expect(savedLot!.images[0].primary).toBe(false)
  })

})

