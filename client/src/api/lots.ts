import {
  createResourceClient,
  getQueryString,
} from './api'
import * as schemas from '../schemas'
import { lots } from '@shared/api'

const lotsApi = createResourceClient('/lots')

export function list( queryParams?: lots.ListQP ): Promise< lots.ListResponse > {

  return lotsApi({
    method: 'get',
    url: `/?${ getQueryString( queryParams ) }`
  })
    .then( resp => schemas.api.lots.ListResponseSchema.parse(resp.data) )

}

export function count( queryParams?: lots.CountQP ): Promise<lots.CountResponse> {

  return lotsApi({
    method: 'get',
    url: `/count?${ getQueryString( queryParams ) }`
  })
    .then( resp => schemas.api.lots.CountResponseSchema.parse(resp.data) );

}

export function get( id: string ): Promise< lots.GetResponse > {

  return lotsApi({
    method: 'get',
    url: `/${ id }`
  })
    .then( resp => schemas.api.lots.GetResponseSchema.parse(resp.data) )

}

