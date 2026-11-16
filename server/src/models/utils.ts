import { Types, DefaultTimestampProps, Model } from 'mongoose'

export type DataRecord<T> = T & { _id: Types.ObjectId } & DefaultTimestampProps

export type ModelFor<TData, TMethods, T, TRecord> = Model<TData, object, TMethods, object, T, unknown, TRecord>
