
import { Schema, HydratedDocument, Types } from 'mongoose'

/*******************************
 * LotMediaDataSchema schema
 * =============================
 *
 ******/

export interface LotMediaData {
  filename?: string
  s3?: string
  primary?: boolean
  isProcessing?: boolean
}

export interface LotMediaMethods {
  finishProcessing: ( s3Location: string ) => LotMedia
}

export type LotMedia = HydratedDocument<LotMediaData, LotMediaMethods>

export type LotMediaArray = Types.DocumentArray<LotMedia>

export const lotMediaSchema = new Schema<LotMediaData, object, LotMediaMethods>(

  {
    filename: String,
    s3: String,
    primary: Boolean,
    isProcessing: Boolean,
  },

  {
    methods: {
      finishProcessing: function( s3Location: string ) {
        this.s3 = s3Location
        this.isProcessing = false
        return this
      }
    }
  }
)
