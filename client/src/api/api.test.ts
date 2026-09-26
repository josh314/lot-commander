import { expect,test } from 'vitest'
import { getQueryString } from './api'

test('getQueryString filters out undefined values', () => {
  const query = {
    a: '1',
    b: undefined,
    c: '3'
  }
  const result = getQueryString(query)
  expect(result).toBe('a=1&c=3')
})