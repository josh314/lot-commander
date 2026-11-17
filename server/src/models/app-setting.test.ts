import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { IllegalActionError } from '../errors'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  Connection,
  createConnection,
} from 'mongoose'

import { appSettingSchema, type AppSetting, type AppSettingData, type AppSettingModel } from './app-setting'


let mongod: MongoMemoryServer
let connection: Connection
let AppSetting: AppSettingModel

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  connection = await createConnection(mongod.getUri()).asPromise()
  AppSetting = connection.model<AppSettingData, AppSettingModel>('AppSetting', appSettingSchema)
})

afterAll(async () => {
  await connection.close()
  await mongod.stop()
})

describe('initialization', () => {

  it('should create an AppSetting instance with a basic value', async () => {
    const appSetting = new AppSetting({
      name: 'test-setting',
      displayName: 'Test Setting',
      value: true,
      type: 'boolean'
    })
    await appSetting.save()
    expect(appSetting._id).toBeDefined()
    expect(appSetting.name).toBe('test-setting')
    expect(appSetting.displayName).toBe('Test Setting')
    expect(appSetting.value).toBe(true)
    expect(appSetting.type).toBe('boolean')
  })

  it('should create an AppSetting instance with a date value', async () => {
    const appSetting = new AppSetting({
      name: 'test-setting',
      displayName: 'Test Setting',
      value: new Date(),
      type: 'date'
    })
    await appSetting.save()
    expect(appSetting._id).toBeDefined()
    expect(appSetting.name).toBe('test-setting')
    expect(appSetting.displayName).toBe('Test Setting')
    expect(appSetting.value).toBeInstanceOf(Date)
    expect(appSetting.type).toBe('date')
  })

})

describe('pre-save hook', () => {

  it('should throw an IllegalActionError for invalid value/type combo - basic type (boolean,string,number)', async () => {
    const appSetting = new AppSetting({
      name: 'test-setting',
      displayName: 'Test Setting',
      value: 'not-a-boolean',
      type: 'boolean'
    })
    await expect(appSetting.save()).rejects.toThrow(IllegalActionError)
  })

  it('should throw an IllegalActionError for invalid value/type combo - Date value for basic type', async () => {
    const appSetting = new AppSetting({
      name: 'test-setting',
      displayName: 'Test Setting',
      value: new Date(),
      type: 'string'
    })
    await expect(appSetting.save()).rejects.toThrow(IllegalActionError)
  })

})