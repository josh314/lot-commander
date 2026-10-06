import { describe, expect, test } from 'vitest'
import { toLotNumberFilter, buildLotQueryParams, type ListFilters } from './list-lots-filters'

describe('toLotNumberFilter', () => {
  test('returns undefined for non-numeric strings, including whitespace', () => {
    expect(toLotNumberFilter('abc')).toBeUndefined()
    expect(toLotNumberFilter('123abc')).toBeUndefined()
    expect(toLotNumberFilter('')).toBeUndefined()
    expect(toLotNumberFilter(' ')).toBeUndefined()
    expect(toLotNumberFilter('\t')).toBeUndefined()
  })

  test('returns a number for numeric strings', () => {
    expect(toLotNumberFilter('123')).toBe(123)
    expect(toLotNumberFilter('0')).toBe(0)
  })
})

describe('buildLotQueryParams', () => {

  test('builds query params correctly - all filters', () => {
    const page = 1
    const num = 25
    const filters: ListFilters = { handle: 'test', lotNumber: '123', status: 'Ready' }
    const result = buildLotQueryParams(page, num, filters)
    expect(result).toEqual({
      page,
      num,
      sort: 'createdAt',
      sort_dir: -1,
      handle: 'test',
      lotNumber: 123,
      status: 'Ready'
    })
  })

  test('builds query params correctly - no filters', () => {
    const page = 1
    const num = 25
    const filters: ListFilters = { handle: '', lotNumber: '', status: 'All' };
    const result = buildLotQueryParams(page, num, filters)
    expect(result).toEqual({
      page,
      num,
      sort: 'createdAt',
      sort_dir: -1,
      handle: undefined,
      lotNumber: undefined,
      status: undefined
    })
  })

})
