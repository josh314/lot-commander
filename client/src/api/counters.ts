import { createResourceClient } from './api'
import * as schemas from '../schemas'

import { counters } from '@shared/api'

const countersApi = createResourceClient('/counters')

export function getCounter( handle: counters.CounterHandle ): Promise<counters.CounterResponse> {

  return countersApi({
    method: 'get',
    url: `/${ encodeURIComponent( handle ) }`
  })
    .then( resp => schemas.api.counters.CounterResponseSchema.parse(resp.data) );

}

export function incrementCounter( handle: counters.CounterHandle, increment?: number ): Promise<counters.CounterResponse>  {

  if (increment === undefined) {
    increment = 1;
  }

  const incrementRequest: counters.IncrementCounterRequest = {
    increment
  }

  return countersApi({
    method: 'post',
    url: `/${ encodeURIComponent( handle ) }`,
    data: incrementRequest
  })
    .then( resp => schemas.api.counters.CounterResponseSchema.parse(resp.data) );

}