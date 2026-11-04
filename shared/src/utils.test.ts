import { describe, test, expect, vi, afterEach } from 'vitest'

import { isNumericString, isDigit, getRandomArrayIndex } from './utils'

describe('isDigit', () => {

  test('isDigit returns true for single digit strings', () => {
    expect(isDigit('0')).toBe(true)
    expect(isDigit('5')).toBe(true)
    expect(isDigit('9')).toBe(true)
  })

  test('isDigit returns false for non-digit strings', () => {
    expect(isDigit('')).toBe(false)
    expect(isDigit('12')).toBe(false)
    expect(isDigit('a')).toBe(false)
    expect(isDigit('-1')).toBe(false)
  })
})

describe('isNumericString', () => {

  test('isNumericString returns true for numerical strings', () => {
    expect(isNumericString('123')).toBe(true)
    expect(isNumericString('0')).toBe(true)
    expect(isNumericString('')).toBe(true) // empty string is trivially considered numeric
  })

  test('isNumericString returns false for strings with non-numeric characters', () => {
    expect(isNumericString('abc')).toBe(false)
    expect(isNumericString(' ')).toBe(false)
    expect(isNumericString('123abc')).toBe(false)
    expect(isNumericString('-123')).toBe(false)
    expect(isNumericString('12.3')).toBe(false)
  })

})

describe('getRandomArrayIndex', () => {

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const arr = [1, 2, 3, 4, 5]

  test('returns 0 when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue( 0 )
    expect(getRandomArrayIndex(arr)).toBe(0)
  })

  test('returns 0 when Math.random returns less than 1/length', () => {
    vi.spyOn(Math, 'random').mockReturnValue( 1 / arr.length - 0.000001 )
    expect(getRandomArrayIndex(arr)).toBe(0)
  })

  test('returns the last index when Math.random returns just under 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue( 1 - 0.0000000000001 )
    expect(getRandomArrayIndex(arr)).toBe(4)
  })

  test('getRandomArrayIndex returns a valid index for a non-empty array', () => {
    const index = getRandomArrayIndex(arr)
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(arr.length)
  })

  test('getRandomArrayIndex throws an error for an empty array', () => {
    const arr: number[] = []
    expect(() => getRandomArrayIndex(arr)).toThrow()
  })

})


