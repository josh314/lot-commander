import { Schema, Types, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'
import { shippingItemSchema, type ShippingItem, type ShippingItemArray } from './shipping-item'
import { lotMediaSchema, type LotMedia, type LotMediaArray } from './lot-media'
import { setPackagingTypeFromShippingItems } from './set-packaging-type-from-shipping-items'
import * as enums from '@shared/enums'
import type { Condition, PackagingType, Category } from '@shared/enums'
import { __DEFAULT_PRICE_VALUE_PCT__ } from '../constants'
import { splitGroupSchema, type SplitGroup, type SplitGroupArray } from './split-group'


/*************************************************
 * Types
 * =====
 *
 ********/

export interface InventoryPalletData {

  handle?: string
  description?: string
  lotNumber?: number
  category?: Category
  condition?: Condition
  cost?: number
  units?: number
  removedItems: object[]
  splitGroups?: Array<SplitGroup>
  splitFrom?: Types.ObjectId
  retailValue?: number
  priceValuePercentage?: number
  salePrice?: number
  hasProblem?: boolean
  note?: string
  isAnonymous?: boolean
  toBeListed?: boolean
  toBeProcessed?: boolean
  isAllocatedForUnmanifestedLots?: boolean
  isMissing?: boolean
  processedDate?: Date
  isRepacked?: boolean
  repackedDate?: Date
  isBrokendown?: boolean
  brokendownDate?: Date
  shipment?: Types.ObjectId
  lot?: Types.ObjectId
  images: Array<LotMedia>
  packagingType?: PackagingType
  shippingItems: Array<ShippingItem>
  isReceived?: boolean
  isDeleted?: boolean
  deletedDate?: Date

}

export type InventoryPalletRecord = DataRecord<InventoryPalletData>

type InventoryPalletMethods = {
  setPackagingTypeFromShippingItems: () => void
  edit(data: Partial<InventoryPalletData>): Promise<InventoryPallet>
  unlinkLot: () => Promise<InventoryPallet>
  breakdown: () => Promise<InventoryPallet>
  unbreakdown: () => Promise<InventoryPallet>
  repack: () => Promise<InventoryPallet>
  unrepack: () => Promise<InventoryPallet>
  delete: () => Promise<InventoryPallet>
  undelete: () => Promise<InventoryPallet>
}

export type InventoryPallet = HydratedDocument<InventoryPalletRecord, InventoryPalletMethods> & {
  splitGroups: SplitGroupArray
  images: LotMediaArray
  shippingItems: ShippingItemArray
}

export type InventoryPalletModel = ModelFor<InventoryPalletData, InventoryPalletMethods, InventoryPallet, InventoryPalletRecord>

/*************************************************
 * Schema
 * ======
 *
 ********/

export const inventoryPalletSchema = new Schema<InventoryPalletData, InventoryPalletModel, InventoryPalletMethods, object, object, object, object, InventoryPalletRecord, InventoryPallet>({
  handle: String,
  description: String,
  lotNumber: Number,
  category: {
    type: String,
    enum: enums.categories
  },
  condition: {
    type: String,
    enum: enums.conditions
  },
  cost: Number,
  units: Number,
  removedItems: [ Object ], // LEGACY
  splitGroups: [ splitGroupSchema ],
  splitFrom: { // parent pallet that this pallet was split from
    type: Schema.Types.ObjectId,
    ref: 'InventoryPallet'
  },
  retailValue: Number,
  priceValuePercentage: Number,
  salePrice: Number,
  hasProblem: { type: Boolean, required: true, default: false },
  note: String,
  isAnonymous: { type: Boolean, required: true, default: false },
  toBeListed: { type: Boolean, required: true, default: false },
  toBeProcessed: { type: Boolean, required: true, default: false },
  isAllocatedForUnmanifestedLots: { type: Boolean, required: true, default: false },
  isMissing: { type: Boolean, required: true, default: false }, // this pallet represents an inventory/manifest of missing units
  processedDate: Date,
  isRepacked: { type: Boolean, required: true, default: false },
  repackedDate: Date,
  isBrokendown: { type: Boolean, required: true, default: false },
  brokendownDate: Date,
  shipment: {
    type: Schema.Types.ObjectId,
    ref: 'IncomingShipment'
  },
  lot: {
    type: Schema.Types.ObjectId,
    ref: 'Lot'
  },
  images: [ lotMediaSchema ],

  /******* Shipping properties ***************/

  packagingType: { type: String, enum: enums.packagingTypes },
  shippingItems: [ shippingItemSchema ],

  isReceived: { type: Boolean, required: true, default: false },
  isDeleted: { type: Boolean, required: true, default: false },
  deletedDate: Date
  //TODO: manifest, breakdown date
}, {
  methods: {
    setPackagingTypeFromShippingItems,

    edit: function( data: Partial<InventoryPalletData> ) {
      Object.assign( this, data )
      return this.save()
    },

    unlinkLot: function() {
      this.lot = undefined
      return this.save()
    },

    breakdown: function() {
      this.isBrokendown = true
      this.brokendownDate = new Date()
      return this.save()
    },

    unbreakdown: function() {
      this.isBrokendown = false
      this.brokendownDate = undefined
      return this.save()
    },

    repack: function() {
      this.isRepacked = true
      this.repackedDate = new Date()
      return this.save()
    },

    unrepack: function() {
      this.isRepacked = false
      this.repackedDate = undefined
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
    }


  },
  collection: 'inventory-pallets',
  timestamps: true
})

/***********************
 *  Middleware
 *
 ******/

// Doing this here prevents errors from empty packagingType
inventoryPalletSchema.pre( 'validate', function() {

  this.setPackagingTypeFromShippingItems()

  if( !this.category ) {
    this.category = undefined
  }

  if( !this.condition ) {
    this.condition = undefined
  }

} )

inventoryPalletSchema.pre( 'save', function() {

  if( !this.priceValuePercentage || this.priceValuePercentage < 0 ) {
    this.priceValuePercentage = __DEFAULT_PRICE_VALUE_PCT__
  }

  // In the below, we normalize falsy properties for the string-valued fields. This actually completely removes the property
  if( !this.handle ) {
    this.handle = undefined
  }

  if( !this.note ) {
    this.note = undefined
  }

} )
