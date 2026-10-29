import * as z from 'zod/v4'

export const IncrementCounterRequestSchema = z.object({
  increment: z.number()
})
export const CounterSchema = z.object({
  _id: z.string(),
  handle: z.string(),
  count: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
})
export const CounterResponseSchema = z.object({
  counter: CounterSchema
})
