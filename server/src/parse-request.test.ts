import { describe, test, expect } from 'vitest'
import * as z from 'zod'

import { parseRequest } from './parse-request'
import { InvalidRequestError } from './errors'

const schema = z.object({ key: z.string() })

describe('parseRequest', () => {

  test('Successful parse', () => {
    expect( parseRequest(schema, { key: "hello" }) ).toEqual({ key: "hello" })
  })

  test('Failed parse with string schema', () => {
    expect(() => parseRequest(schema, { key: 123 })).toThrow(InvalidRequestError)
  })

  test('Failed parse with named value', () => {
    expect(() => parseRequest(schema, { key: 123 }, "key")).toThrow(InvalidRequestError)
  })

})