import { Types, DefaultTimestampProps } from 'mongoose'

export type DataRecord<T> = T & { _id: Types.ObjectId } & DefaultTimestampProps