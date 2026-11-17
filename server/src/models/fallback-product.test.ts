import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Connection,
  createConnection,
} from 'mongoose'

import { fallbackProductSchema, type FallbackProductData, type FallbackProductModel } from './fallback-product'


let mongod: MongoMemoryServer
let connection: Connection
let FallbackProduct: FallbackProductModel

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  FallbackProduct = connection.model<FallbackProductData, FallbackProductModel>('FallbackProduct', fallbackProductSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('Product model initialization', () => {
  it('Throw without required fields', async () => {
    const fallbackProduct = new FallbackProduct({})
    await expect(fallbackProduct.save()).rejects.toThrow()
  })


  it('Default an empty images array', () => {
    const fallbackProduct = new FallbackProduct({
      pattern: 'test-pattern',
      data: {
        barcode: '123456789',
        title: 'Test Product'
      }
    })
    expect(fallbackProduct.data.images).toEqual([])
  })
})

describe('getData', () => {
  it('should return the correct data', () => {
    const fallbackProduct = new FallbackProduct({
      pattern: 'test-pattern',
      data: {
        barcode: '123456789',
        title: 'Test Product',
        images: [
          'test-image.jpg'
        ]
      }
    })

    const data = fallbackProduct.getData()
    expect(data).toEqual({
      barcode: '123456789',
      title: 'Test Product',
      images: ['test-image.jpg']
    })
  })

} )