import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { announcementSchema } from '../models/announcement'
import { AnnouncementSvc } from './announcement-svc'

import { ResourceNotFoundError } from '../errors'

describe('AnnouncementSvc', () => {
  let mongod: MongoMemoryServer
  let connection: mongoose.Connection
  let svc: AnnouncementSvc

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    connection = await mongoose.createConnection(mongod.getUri()).asPromise()
    const Announcement = connection.model('Announcement', announcementSchema)
    svc = new AnnouncementSvc( Announcement )

    await Announcement.create({ header: 'Heads up', body: 'This is a test announcement.', isActive: true })
    await Announcement.create({ header: 'Heads up 2', body: 'this is another test announcement.', isActive: false })
    await Announcement.create({ header: 'Heads up 42', body: 'Yet another test announcement.', isActive: true })
  })

  afterAll(async () => {
    await connection.close()
    await mongod.stop()
  })

  test('lists announcements', async () => {

    const announcements = await svc.list( {} )
    expect(announcements).toHaveLength(3)
    expect(announcements[0].header).toBe('Heads up')
  })

  test('lists active announcements', async () => {
    const query = {
      isActive: true
    }

    const announcements = await svc.list( query )
    expect(announcements).toHaveLength(2)
    expect(announcements[0].header).toBe('Heads up')
  })

  test('delete throws for non-existent announcement', async () => {
    const nonexistentid = new mongoose.Types.ObjectId().toString()
    await expect(svc.delete(nonexistentid)).rejects.toThrow(ResourceNotFoundError)
  })

  test('edit throws for non-existent announcement', async () => {
    const nonexistentid = new mongoose.Types.ObjectId().toString()
    await expect(svc.edit(nonexistentid, { header: 'Updated' })).rejects.toThrow(ResourceNotFoundError)
  })

})