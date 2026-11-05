
import { Schema, DefaultTimestampProps } from 'mongoose'

/*******************************
 * Site Announcement schema
 * =============================
 *
 ******/

export interface ISiteAnnouncement extends DefaultTimestampProps {
  header: string
  body: string
  isActive: boolean
}

export const siteAnnouncementSchema = new Schema<ISiteAnnouncement>(

  {
    header: { type: String, required: true },
    body: { type: String, required: true },
    isActive: { type: Boolean, required: true },
  },

  { collection: 'site-announcements', timestamps: true }
)
