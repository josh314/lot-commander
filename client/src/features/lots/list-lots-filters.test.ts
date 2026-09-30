import { expect, test } from 'vitest'
import { toLotNumberFilter } from './list-lots-filters'

test('toLotNumberFilter returns undefined for non-numeric strings, including whitespace', () => {
  expect(toLotNumberFilter('abc')).toBeUndefined()
  expect(toLotNumberFilter('123abc')).toBeUndefined()
  expect(toLotNumberFilter('')).toBeUndefined()
  expect(toLotNumberFilter(' ')).toBeUndefined()
  expect(toLotNumberFilter('\t')).toBeUndefined()
})

test('toLotNumberFilter returns a number for numeric strings', () => {
  expect(toLotNumberFilter('123')).toBe(123)
  expect(toLotNumberFilter('0')).toBe(0)
})