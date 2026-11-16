import { Schema, Types, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'

export interface PackageData {
  handle?: string
  units?: number
  productId?: string
  productTitle?: string
  category?: string
  condition?: string
  isInstantiated?: boolean
  instantiatedDate?: Date
  isDeleted?: boolean
  deletedDate?: Date
  pallet?: Types.ObjectId
  shipment?: Types.ObjectId
  isFulfilled?: boolean
  fulfilledDate?: Date
}

export type PackageRecord = DataRecord<PackageData>

export interface PackageMethods {
  edit(data: Partial<PackageData>): Promise<Package>
  instantiate(): Promise<Package>
  uninstantiate(): Promise<Package>
  delete(): Promise<Package>
  undelete(): Promise<Package>
  fulfill(): Promise<Package>
  unfulfill(): Promise<Package>
}

export type Package = HydratedDocument<PackageRecord, PackageMethods>

export type PackageModel = ModelFor<PackageData, PackageMethods, Package, PackageRecord>


export const packageSchema = new Schema<PackageData, PackageModel, PackageMethods, object, object, object, object, PackageRecord, Package>({
  handle: String,
  units: Number,

  productId: String,
  productTitle: String,

  category: String,
  condition: String,
  isInstantiated: { type: Boolean, default: false, required: true },
  instantiatedDate: Date,
  isDeleted: { type: Boolean, default: false, required: true },
  deletedDate: Date,
  pallet: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryPallet'
  },
  shipment: {
    type: Schema.Types.ObjectId,
    ref: 'IncomingShipment'
  },

  isFulfilled: { type: Boolean, default: false, required: true },
  fulfilledDate: Date

}, {
  collection: 'packages',
  timestamps: true,

  methods: {
    edit: function( data: Partial<PackageData> ) {
      Object.assign( this, data )
      return this.save()
    },
    instantiate: function() {
      this.isInstantiated = true
      this.instantiatedDate = this.instantiatedDate || new Date()
      return this.save()
    },
    uninstantiate: function() {
      this.isInstantiated = false
      this.instantiatedDate = undefined
      return this.save()
    },
    delete: function() {
      this.isDeleted = true
      this.deletedDate = new Date()
      return this.save()
    },
    undelete: function() {
      this.isDeleted = false
      this.deletedDate = undefined
      return this.save()
    },
    fulfill: function() {
      this.isFulfilled = true
      this.fulfilledDate = new Date()
      return this.save()
    },
    unfulfill: function() {
      this.isFulfilled = false
      this.fulfilledDate = undefined
      return this.save()
    }
  }

})
