import * as z from 'zod/v4'
import * as enums from '../enums'

export const InitializeRequestSchema = z.object({
  handle: z.string(),
  count: z.number().int().nonnegative(),
})

export const IncrementRequestSchema = z.object({
  increment: z.number().int().positive(),
})

export const HandleSchema = z.enum(enums.counterHandles)

export const DTOSchema = z.object({
  _id: z.string(),
  handle: HandleSchema,
  count: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const ResponseSchema = z.object({
  counter: z.union([DTOSchema, z.null()])
})

export type Handle = enums.CounterHandle
export type IncrementRequest = z.infer<typeof IncrementRequestSchema>
export type InitializeRequest = z.infer<typeof InitializeRequestSchema>
export type DTO = z.infer<typeof DTOSchema>
export type Response = z.infer<typeof ResponseSchema>
