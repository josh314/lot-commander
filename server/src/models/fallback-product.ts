import { Schema, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'

import { productDefinition, type ProductData } from './product'

export interface FallbackProductData {
  pattern: string
  data: ProductData
}

export type FallbackProductRecord = DataRecord<FallbackProductData>

export type FallbackProductMethods = {
  getData: () => ProductData
}

export type FallbackProduct = HydratedDocument<FallbackProductRecord, FallbackProductMethods>

export type FallbackProductModel = ModelFor<FallbackProductData, FallbackProductMethods, FallbackProduct, FallbackProductRecord>



export const fallbackProductSchema = new Schema<FallbackProductData,FallbackProductModel, FallbackProductMethods, object, object, object, object, FallbackProductRecord, FallbackProduct>(
  {
    pattern: { type: String, required: true }, // a string to be compiled to regex
    data: {
      type: productDefinition,
      required: true,
      _id: false
    }
  },

  {
    methods: {
      getData: function() {
        const res = this.toObject().data

        res.title = res.description || res.title
        if( res.description ) {
          delete res.description
        }
        return res
      }
    },
    collection: 'fallback-product-data',
    timestamps: true
  }

)
