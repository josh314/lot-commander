import * as z from 'zod/v4'

import { client } from '../schemas'

import type { SortDir } from './utils'

export type Status = z.infer<typeof client.api.lots.StatusSchema>
export type CountResponse = z.infer<typeof client.api.lots.CountResponseSchema>
export type Data = z.infer<typeof client.api.lots.DataSchema>
export type ListResponse = z.infer<typeof client.api.lots.ListResponseSchema>
export type GetResponse = z.infer<typeof client.api.lots.GetResponseSchema>


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
