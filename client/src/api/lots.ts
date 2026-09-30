import {
  createResourceClient,
  getQueryString,
  type SortDir
} from './api'
import * as schemas from '../schemas'

const lotsApi = createResourceClient('/lots')

export type ListLotsPageAndSortQueryParams = {
  page?: number
  num?: number
  sort?: string           // what key to sort by
  sort_dir?: SortDir       // sort direction, -1 for descending, 1 for ascending
}

export type ListLotsFilterParams = {
  startDate?: string
  endDate?: string
  status?: string
  lotNumber?: number
  handle?: string
}

export type ListLotsQP = ListLotsPageAndSortQueryParams & ListLotsFilterParams

export function list( queryParams?: ListLotsQP ): Promise< schemas.api.lots.ListResponse > {

  return lotsApi({
    method: 'get',
    url: `/?${ getQueryString( queryParams ) }`
  })
    .then( resp => schemas.api.lots.ListResponseSchema.parse(resp.data) )

}

export type CountLotsQP = ListLotsFilterParams

export function count( queryParams?: CountLotsQP ): Promise<schemas.api.lots.CountResponse> {

  return lotsApi({
    method: 'get',
    url: `/count?${ getQueryString( queryParams ) }`
  })
    .then( resp => schemas.api.lots.CountResponseSchema.parse(resp.data) );

}

export function get( id: string ): Promise<schemas.api.lots.GetResponse> {

  return lotsApi({
    method: 'get',
    url: `/${ id }`
  })
    .then( resp => schemas.api.lots.GetResponseSchema.parse(resp.data) )

}
