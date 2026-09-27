import {
  createResourceClient,
  getQueryString
} from './api'
import {
  CountLotsResponseSchema,
  type CountLotsResponse,
  type LotData,
  ListLotsResponseSchema,
} from '../schemas/api'

const lotsApi = createResourceClient('/lots')

type ListLotsQP = {
  startDate?: string
  endDate?: string
  status?: string
  lotNumber?: string
  handle?: string
}

export function list( queryParams?: ListLotsQP ): Promise< LotData[] > {

  return lotsApi({
    method: 'get',
    url: `/?${ getQueryString( queryParams ) }`
  })
    .then( resp => ListLotsResponseSchema.parse(resp.data) )
    .then( ( { lots } ) => lots )


}

export function count( queryParams?: ListLotsQP ): Promise<CountLotsResponse> {

  return lotsApi({
    method: 'get',
    url: `/count?${ getQueryString( queryParams ) }`
  })
    .then( resp => CountLotsResponseSchema.parse(resp.data) );

}

