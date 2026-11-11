
import * as mongoose from 'mongoose'

/*******************************
 * LotMediaDataSchema schema
 * =============================
 *
 ******/

export interface ILotMediaData {
  filename?: string
  s3?: string
  primary?: boolean
  isProcessing?: boolean
}

export const lotMediaDataSchema = new mongoose.Schema<ILotMediaData, object, ILotMediaDataMethods>(

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

export interface ILotMediaDataMethods {
  finishProcessing: ( s3Location: string ) => ILotMediaData
}

export type THydratedLotMediaData = ILotMediaData & ILotMediaDataMethods & { _id: mongoose.Types.ObjectId }
