import { createResourceClient } from './api'

import { counters } from '@shared/api'

const countersApi = createResourceClient('/counters')

export function getCounter( handle: counters.Handle ): Promise<counters.Response> {

  return countersApi({
    method: 'get',
    url: `/${ encodeURIComponent( handle ) }`
  })
    .then( resp => counters.ResponseSchema.parse(resp.data) );

}

export function incrementCounter( handle: counters.Handle, increment?: number ): Promise<counters.Response>  {

  if (increment === undefined) {
    increment = 1;
  }

  const incrementRequest: counters.IncrementRequest = {
    increment
  }

  return countersApi({
    method: 'post',
    url: `/${ encodeURIComponent( handle ) }`,
    data: incrementRequest
  })
    .then( resp => counters.ResponseSchema.parse(resp.data) );

}