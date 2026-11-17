import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Connection,
  createConnection,
} from 'mongoose'

import { productSchema, type ProductData, type ProductModel } from './product'


let mongod: MongoMemoryServer
let connection: Connection
let Product: ProductModel

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  Product = connection.model<ProductData, ProductModel>('Product', productSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('Save and retrieve', () => {
  it('should save and retrieve a product', async () => {
    const product = new Product({})
    await product.save()

    const found = await Product.findById(product._id)
    expect(found).not.toBeNull()
    expect(found?._id).toEqual(product._id)
  })
})