import { queryOptions, useQuery, keepPreviousData } from '@tanstack/react-query'

import { lots } from '@shared/api'

import * as api from '../api'
import { Lot } from '../lib/Lot'

export function countOptions( queryParams?: lots.CountQP ) {
  return queryOptions({
    queryKey: [ 'lots', 'count', queryParams ],
    queryFn: () => api.lots.count( queryParams ),
    placeholderData: { count: 0 },
  })
}

export function useCount( queryParams?: lots.CountQP ) {
  return useQuery(countOptions(queryParams))
}

export function listOptions( queryParams?: lots.ListQP ) {
  return queryOptions({
    queryKey: [ 'lots', 'list', queryParams ],
    queryFn: () => api.lots.list( queryParams ).then( resp => resp.lots.map( lotData => new Lot( lotData ) )),
    placeholderData: keepPreviousData
  })
}

export function useList( queryParams?: lots.ListQP ) {
  return useQuery(listOptions(queryParams))
}

export function usePaginatedList( queryParams?: lots.ListQP ): { isPending: boolean, error: Error | null, count: number, lots: Lot[] } {

  const { isPending: isCountPending, error: countError, data: countData } = useCount(queryParams)
  const { isPending: isListPending, error: listError, data: listData } = useList(queryParams)

  return { isPending: isCountPending || isListPending, error: countError ?? listError, count: countData?.count ?? 0, lots: listData ?? [] }
}

export function getOptions( id: string ) {
  return queryOptions({
    queryKey: [ 'lots', id ],
    queryFn: () => api.lots.get(id).then( resp => new Lot( resp.lot ) ),
  })
}

export function useGet( id: string ) {
  return useQuery(getOptions(id))
}