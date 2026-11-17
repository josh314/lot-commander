import { Schema, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'

import { productDefinition, type ProductData } from './product'

interface InventoryItem extends ProductData {
  quantity?: number
}

export interface ManifestData {
  handle: string
  description?: string
  inventory: Array<InventoryItem>
}

export type ManifestRecord = DataRecord<ManifestData>

export type Manifest = HydratedDocument<ManifestRecord, object>

export type ManifestModel = ModelFor<ManifestData, object, Manifest, ManifestRecord>

export const manifestSchema = new Schema<ManifestData, ManifestModel, object, object, object, object, object, ManifestRecord, Manifest>({

  handle: {
    type: String,
    // index: true,
    required: true
  },

  description: String,

  inventory: [{
    ...productDefinition,
    quantity: Number,
    _id: false
  }],

}, { collection: 'manifests', timestamps: true } );
