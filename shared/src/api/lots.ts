import * as z from 'zod/v4'

import * as enums from '../enums'
import type { SortDir } from './utils'


export const CountResponseSchema = z.object({
  count: z.number(),
})

export const StatusSchema = z.enum(enums.lotStatuses)

export const DTOSchema = z.object({
  _id: z.string(),
  handle: z.string(),
  totalUnits: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: StatusSchema,
})

export const ListResponseSchema = z.object({
  lots: z.array( DTOSchema )
})

export const GetResponseSchema = z.object({
  lot: DTOSchema
})

export type Status = enums.LotStatus
export type CountResponse = z.infer<typeof CountResponseSchema>
export type DTO = z.infer<typeof DTOSchema>
export type ListResponse = z.infer<typeof ListResponseSchema>
export type GetResponse = z.infer<typeof GetResponseSchema>


export type ListPageAndSortQueryParams = {
  page?: number
  num?: number
  sort?: string           // what key to sort by
  sort_dir?: SortDir
}

export type ListFilterParams = {
  startDate?: string
  endDate?: string
  status?: string
  lotNumber?: number
  handle?: string
}

export type ListQP = ListPageAndSortQueryParams & ListFilterParams
export type CountQP = ListFilterParams
