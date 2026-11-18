import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { counterSchema, type CounterData, type CounterModel } from '../models/counter'
import { CountCommander } from './count-commander'

describe('CountCommander', () => {
  let mongod: MongoMemoryServer
  let connection: mongoose.Connection
  let commander: CountCommander

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    connection = await mongoose.createConnection(mongod.getUri()).asPromise()
    const Counter = connection.model<CounterData,CounterModel>('Counter', counterSchema)
    commander = new CountCommander(Counter)
    await Counter.create({ handle: 'pallet-lots', count: 0 })
  })

  afterAll(async () => {
    await connection.close()
    await mongod.stop()
  })

  test('atomically increments and returns the updated document', async () => {
    const updated = await commander.incrementCounter('pallet-lots', 5)
    expect(updated?.count).toBe(5)
  })
})