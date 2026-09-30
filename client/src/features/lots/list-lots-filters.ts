import type { SortDir } from '../../api/api'
import { Statuses as LotStatuses, type Status as LotStatus } from '../../schemas/api/lots'

export type FilterStatusOption = LotStatus | 'All'
export const FILTER_STATUS_OPTIONS: FilterStatusOption[] = ['All', ...Object.values(LotStatuses)]
export interface ListFilters {
  handle: string
  lotNumber: string
  status: FilterStatusOption
}

export function toLotNumberFilter(value: string): number | undefined {
  const trimmed = value.trim()
  const parsed = Number(trimmed)
  return trimmed && Number.isFinite(parsed) ? parsed : undefined
}

export function buildLotQueryParams(page: number, num: number, filters: ListFilters) {
  return {
    page,
    num,
    sort: 'createdAt',
    sort_dir: -1 as SortDir,
    handle: filters.handle || undefined,
    lotNumber: toLotNumberFilter(filters.lotNumber),
    status: filters.status === 'All' ? undefined : filters.status,
  }
}
