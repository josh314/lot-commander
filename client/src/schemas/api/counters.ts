import * as z from 'zod/v4'

export const DataSchema = z.object({
  _id: z.string(),
  handle: z.string(),
  count: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
})
export const ResponseSchema = z.object({
  counter: z.union([DataSchema, z.null()])
})
