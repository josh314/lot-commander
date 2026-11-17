import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Connection,
  createConnection,
} from 'mongoose'

import { manifestSchema, type ManifestData, type ManifestModel } from './manifest'


let mongod: MongoMemoryServer
let connection: Connection
let Manifest: ManifestModel

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  Manifest = connection.model<ManifestData, ManifestModel>('Manifest', manifestSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('Manifest model initialization', () => {
  it('Throws without required fields', async () => {
    const manifest = new Manifest({})
    await expect(manifest.save()).rejects.toThrow()
  })
})
