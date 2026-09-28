import * as z from 'zod/v4'

export const CountResponseSchema = z.object({
  count: z.number(),
})
export type CountResponse = z.infer<typeof CountResponseSchema>

export const Statuses = [
  'In Preparation',
  'Pending Data',
  'Ready',
  'Reviewed',
  'Listed',
  'Sold',
  'Shipped',
  'Error',
  'Decommissioned',
] as const

export const StatusSchema = z.enum(Statuses)

export type Status = z.infer<typeof StatusSchema>

export const DataSchema = z.object({
  _id: z.string(),
  handle: z.string(),
  totalUnits: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  status: StatusSchema.optional(),
})
export type Data = z.infer<typeof DataSchema>

export const ListResponseSchema = z.object({
  lots: z.array( DataSchema )
})
export type ListResponse = z.infer<typeof ListResponseSchema>

export const GetResponseSchema = z.object({
  lot: DataSchema
})
export type GetResponse = z.infer<typeof GetResponseSchema>
