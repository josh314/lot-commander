
import { Schema, HydratedDocument, InferSchemaType, Model } from 'mongoose'

/*******************************
 * Site Announcement schema
 * =============================
 *
 ******/

export const announcementSchema = new Schema(

  {
    header: { type: String, required: true },
    body: { type: String, required: true },
    isActive: { type: Boolean, required: true },
  },

  { collection: 'site-announcements', timestamps: true }
)

export type AnnouncementData = InferSchemaType<typeof announcementSchema>
export type Announcement = HydratedDocument<AnnouncementData>
export type AnnouncementModel = Model<AnnouncementData>