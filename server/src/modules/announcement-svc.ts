
import type { AnnouncementModel } from '../models/announcement'

import * as api from '@shared/api'

import {
  ResourceNotFoundError,
} from '../errors'

import { buildMongoListQuery } from '../utils'

export class AnnouncementSvc {

  constructor( private Announcement: AnnouncementModel ) {}

  async list( qp: api.announcements.ListRequestQueryParams )  {

    const { skip, num: _num, sortParams, filterParams } = buildMongoListQuery( qp )

    return this.Announcement.find( filterParams  ).skip( skip ).limit( _num ).sort( sortParams ).exec()

  }

  count( filterParams: api.announcements.CountRequestQueryParams ) {

    return this.Announcement.countDocuments( filterParams )

  }

  async get( announcementId: string ) {
    const announcement = await this.Announcement.findById( announcementId )
    if( !announcement ) {
      throw new ResourceNotFoundError( { type: 'announcement', id: announcementId } )
    }
    return announcement
  }

  async listCurrent() {

    const filterParams = {
      isActive: true
    }

    return this.list( filterParams )
  }

  async create( data: api.announcements.CreateRequestBody ) {
    const announcement = await this.Announcement.create( data )
    return { announcement }
  }

  async edit( announcementId: string, data: api.announcements.EditRequestBody ) {

    const announcement = await this.Announcement.findByIdAndUpdate( announcementId, data, { returnDocument: 'after' } )

    if( !announcement ) {
      throw new ResourceNotFoundError( { type: 'announcement', id: announcementId } )
    }

    return { announcement }

  }

  async delete( announcementId: string ) {

    const announcement = await this.Announcement.findByIdAndDelete( announcementId )

    if( !announcement ) {
      throw new ResourceNotFoundError( { type: 'announcement', id: announcementId } )
    }

  }

}
