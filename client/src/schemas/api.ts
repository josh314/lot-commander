import * as z from 'zod/v4'

export const CountLotsResponseSchema = z.object({
  count: z.number(),
})
export type CountLotsResponse = z.infer<typeof CountLotsResponseSchema>

export const LotDataSchema = z.object({
  _id: z.string(),
  handle: z.string(),
})
export type LotData = z.infer<typeof LotDataSchema>

export const ListLotsResponseSchema = z.object({
  lots: z.array( LotDataSchema )
})
export type ListLotsResponse = z.infer<typeof ListLotsResponseSchema>
