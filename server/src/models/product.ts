import { Schema, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'

export interface ProductData {
  barcode?: string
  asin?: string
  title?: string
  description?: string
  brand?: string
  price?: number
  images?: string[]
  source?: string
}

export const productDefinition = {
  barcode: String,
  asin: String,
  title: String,
  description: String,
  brand: String,
  price: Number,
  images: [ String ],
  source: {
    type: String,
    match: /^(manual|ai-backfill:.+)$/
  },
} as const


export type ProductRecord = DataRecord<ProductData>

export type Product = HydratedDocument<ProductRecord>

export type ProductModel = ModelFor<ProductData, object, Product, ProductRecord>

export const productSchema = new Schema<ProductData, ProductModel, object, object, object, object, object, ProductRecord, Product>(
  productDefinition,
  { timestamps: true }
);
