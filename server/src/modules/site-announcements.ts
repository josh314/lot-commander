import type { Model } from 'mongoose'
import type { ISiteAnnouncement } from '../models/announcement'

import * as api from '@shared/api'

import {
  ResourceNotFoundError,
} from '../errors'

export class AnnouncementSvc {

  constructor( private Announcement: Model<ISiteAnnouncement> ) {}

  async list( qp: api.announcements.ListRequestQueryParams )  {

    const { num, page, sort, sortDir, ...rest } = qp
    const filterParams = { ...rest }
    const _num = num ?? 20
    const skip = ((page ?? 1) - 1) * _num


    let sortField
    if ( sort ) {
      sortField = sort
    }
    else {
      sortField = 'createdAt'
    }

    const sortParams = {
      [ sortField ] : sortDir || 1
    }

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

    const announcement = await this.Announcement.findByIdAndUpdate( announcementId, data, { new: true } )

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
