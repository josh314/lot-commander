import { Schema, InferSchemaType, HydratedDocument, Model } from 'mongoose'

import * as enums from '@shared/enums'

export const counterSchema = new Schema(

  {
    handle: {
      type: String,
      enum: enums.counterHandles as readonly string[],
      index: true, // This is safe since there will be very few counters
      required: true,
      unique: true
    },
    count: { type: Number, required: true },
  },

  {

    collection: 'counters',
    timestamps: true,

  },
)

export type CounterData = InferSchemaType<typeof counterSchema>
export type Counter = HydratedDocument<CounterData>
export type CounterModel = Model<CounterData>
