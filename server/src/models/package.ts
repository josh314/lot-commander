import { Schema, Model, HydratedDocument } from 'mongoose'
import type { DataRecord } from './utils'

export interface PackageData {
  handle: string
  units: number
  productId: string
  productTitle: string
  category: string
  condition: string
  isInstantiated: boolean
  instantiatedDate?: Date
  isDeleted: boolean
  deletedDate?: Date
  pallet?: string
  shipment?: string
  isFulfilled: boolean
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

export type PackageModel = Model<PackageData, object, PackageMethods, object, Package, unknown, PackageRecord>


export const packageSchema = new Schema<PackageData, PackageModel, PackageMethods, object, object, object, object, PackageRecord, Package>({
  handle: String,
  units: Number,

  productId: String,
  productTitle: String,

  category: String,
  condition: String,
  isInstantiated: Boolean,
  instantiatedDate: Date,
  isDeleted: Boolean,
  deletedDate: Date,
  pallet: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryPallet'
  },
  shipment: {
    type: Schema.Types.ObjectId,
    ref: 'IncomingShipment'
  },

  isFulfilled: Boolean,
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

// /***********************
//  * Package pre-save hook
//  *
//  ******/
packageSchema.pre( 'save', function() {

  if( typeof this.isInstantiated !== 'boolean' ) {
    this.isInstantiated = false
  }

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false
  }

  if( typeof this.isFulfilled !== 'boolean' ) {
    this.isFulfilled = false
  }

} )
