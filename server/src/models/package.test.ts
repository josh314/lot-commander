import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Connection,
  createConnection,
} from 'mongoose'

import { packageSchema, type Package, type PackageData, type PackageModel } from './package'


let mongod: MongoMemoryServer
let connection: Connection
let Package: PackageModel

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  Package = connection.model<PackageData, PackageModel>('Package', packageSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('Package model initialization', () => {
  it('No required fields', async () => {
    const pkg = new Package({})

    const getSpy = vi.spyOn(pkg, 'save')

    await pkg.save()
    expect(getSpy).toHaveResolved()
  })

  it('Default values', () => {
    const pkg = new Package({})
    expect(pkg.isInstantiated).toBe(false)
    expect(pkg.isFulfilled).toBe(false)
    expect(pkg.isDeleted).toBe(false)
  })
})