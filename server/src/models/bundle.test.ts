import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Connection,
  createConnection,
} from 'mongoose'

import { bundleSchema, type Bundle, type BundleData, type BundleModel } from './bundle'


let mongod: MongoMemoryServer
let connection: Connection
let Bundle: BundleModel

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  Bundle = connection.model<BundleData, BundleModel>('Bundle', bundleSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('Bundle model initialization', () => {
  it('No required fields', async () => {
    const bundle = new Bundle({})

    const getSpy = vi.spyOn(bundle, 'save')

    await bundle.save()
    expect(getSpy).toHaveResolved()
  })

  it('Default values', () => {
    const bundle = new Bundle({})

    expect(bundle.isPacked).toBe(false)
    expect(bundle.isDeleted).toBe(false)
  })
})