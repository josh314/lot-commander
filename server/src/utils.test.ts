import { describe, it, expect } from 'vitest'

import type { SortDir } from '@shared/api'
import { buildMongoListQuery } from './utils'

describe('buildMongoListQuery', () => {

  it('should return correct skip and num values', () => {
    const qp = { num: 10, page: 2 }
    const result = buildMongoListQuery(qp)
    expect(result.skip).toBe(10)
    expect(result.num).toBe(10)
  })

  it('should use default num and page values', () => {
    const qp = {}
    const result = buildMongoListQuery(qp)
    expect(result.skip).toBe(0)
    expect(result.num).toBe(20)
  })

  it('should return correct sortParams', () => {
    const qp = { sort: 'name', sortDir: -1 as SortDir }
    const result = buildMongoListQuery(qp)
    expect(result.sortParams).toEqual({ name: -1 })
  })

  it('should default sortParams to createdAt ascending', () => {
    const qp = {}
    const result = buildMongoListQuery(qp)
    expect(result.sortParams).toEqual({ createdAt: 1 })
  })

})