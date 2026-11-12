import { Router } from 'express'

import * as auth from '../auth'

import type { Announcement } from '../models/announcement'
import { AnnouncementSvc } from '../modules/announcement-svc'
import * as api from '@shared/api'

import { parseRequest } from '../parse-request'

function announcementToDTO( announcement: Announcement ): api.announcements.DTO {
  return {
    _id: announcement._id.toString(),
    header: announcement.header,
    body: announcement.body,
    isActive: announcement.isActive,
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
  }
}

/**********************************************
 * Routes function for export
 * ==========================
 *
 **********/

export function createRouter( siteAnnouncements: AnnouncementSvc ) {
  const router = Router()

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.get(

    '/',

    auth.isSuperuser,

    async function listAnnouncements( req, res ) {

      const announcements = await siteAnnouncements.list(
        parseRequest( api.announcements.ListRequestQueryParamsSchema, req.query )
      )

      const resp: api.announcements.ListResponse = { announcements: announcements.map( announcementToDTO ) }

      res.json( resp )

    }

  )

  router.get(

    '/count',

    auth.isSuperuser,

    async function countAnnouncements( req, res ) {

      const count = await siteAnnouncements.count(
        parseRequest( api.announcements.CountRequestQueryParamsSchema, req.query )
      )

      const resp: api.announcements.CountResponse = { count: count }

      res.json( resp )

    }

  )

  router.get(

    '/:announcementId',

    auth.isSuperuser,

    async function getAnnouncementById( req, res ) {

      const { announcementId } = req.params

      const announcement = await siteAnnouncements.get( announcementId )

      const resp: api.announcements.GetResponse = { announcement: announcementToDTO( announcement ) }

      res.json( resp )

    }

  )

  router.delete(

    '/:announcementId',

    auth.isSuperuser,


    async function deleteAnnouncement( req, res ) {

      const { announcementId } = req.params

      await siteAnnouncements.delete( announcementId )

      res.json( { success: true } )

    }

  )

  router.post(

    '/',

    auth.isSuperuser,

    async function createAnnouncement( req, res ) {

      const body = parseRequest( api.announcements.CreateRequestBodySchema, req.body )

      const { announcement } = await siteAnnouncements.create( body )

      const resp: api.announcements.CreateResponse = { announcement: announcementToDTO( announcement ) }

      res.json( resp )

    }

  )

  router.patch(

    '/:announcementId',

    auth.isSuperuser,

    async function editAnnouncement( req, res ){

      const { announcementId } = req.params

      const { announcement } = await siteAnnouncements.edit(
        announcementId,
        parseRequest( api.announcements.EditRequestBodySchema, req.body )
      )

      const resp: api.announcements.EditResponse = { announcement: announcementToDTO( announcement ) }

      res.json( resp )


    }
  )

  return router

}