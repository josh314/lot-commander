import { useState } from 'react'

import { queryOptions, useQuery } from '@tanstack/react-query'

import * as api from '../api'
import { counters } from '@shared/api'

function IncrementCounterOnceOptions( handle: counters.Handle, nonce: string ) {
  return queryOptions({
    queryKey: ['counters', 'increment', handle, nonce],
    queryFn: () => api.counters.incrementCounter( handle ),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}

// This is actually a mutation, but we use useQuery to ensure it only runs once per nonce.
export function useIncrementCounterOnce( handle: counters.Handle) {
  const [nonce, _setNonce] = useState(()=> crypto.randomUUID())

  return useQuery(
    IncrementCounterOnceOptions(handle, nonce)
  )
}