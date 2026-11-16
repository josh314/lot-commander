import{ Schema, Types, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'

import { bundleTypes, type BundleType } from '@shared/enums'

export interface BundleData {
  handle?: string
  units?: number
  type?: BundleType
  isPacked?: boolean
  packedDate?: Date
  isDeleted?: boolean
  deletedDate?: Date
  package?: Types.ObjectId
}

export type BundleRecord = DataRecord<BundleData>

interface BundleMethods {
  edit( data: Partial<BundleData>) : Promise<Bundle>
  pack( packageId?: Types.ObjectId): Promise<Bundle>
  unpack(): Promise<Bundle>
  delete(): Promise<Bundle>
  undelete(): Promise<Bundle>
}

export type Bundle = HydratedDocument<BundleRecord, BundleMethods>

export type BundleModel = ModelFor<BundleData, BundleMethods, Bundle, BundleRecord>

export const bundleSchema = new Schema<BundleData, BundleModel, BundleMethods, object, object, object, object, BundleRecord, Bundle>(

  {
    handle: String,
    units: Number,
    type: { type: String, enum: bundleTypes },
    isPacked: { type: Boolean, default: false, required: true },
    packedDate: Date,
    isDeleted: { type: Boolean, default: false, required: true },
    deletedDate: Date,
    package: {
      type: Schema.Types.ObjectId,
      ref: 'Package'
    },
  },

  {
    methods: {
      edit: async function( data: Partial<BundleData> ) {
        Object.assign( this, data )
        return this.save()
      },
      pack: async function( packageId?: Types.ObjectId ) {
        this.isPacked = true
        this.packedDate = new Date()

        if( packageId ) {
          this.package = packageId
        }

        return this.save()
      },
      unpack: async function() {
        this.isPacked = false
        this.packedDate = undefined
        return this.save()
      },
      delete: async function() {
        this.isDeleted = true
        this.deletedDate = new Date()
        return this.save()
      },
      undelete: async function() {
        this.isDeleted = false
        this.deletedDate = undefined
        return this.save()
      }
    },
    collection: 'bundles',
    timestamps: true
  }

)

