import * as z from 'zod/v4'

// sort direction, -1 for descending, 1 for ascending
export const SortDirSchema = z.union([z.literal(-1), z.literal(1)])
export type SortDir = z.infer<typeof SortDirSchema>

export const RequestListQueryParamsSchema = z.object({
  num: z.number().optional(),
  page: z.number().optional(),
  sort: z.string().optional(),
  sortDir: SortDirSchema.optional()
})

export type RequestListQueryParams = z.infer<typeof RequestListQueryParamsSchema>