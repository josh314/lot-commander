import { describe, expect, test } from 'vitest'
import { User, getLoggedInUser } from './auth'
import type { UserCookie } from '../schemas/user'

test('User class tests', () => {

  const cookie: UserCookie = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    roles: [ 'foobar' ],
    permissions: [ 'foo', 'bar' ],
    isDeveloper: false,
    isDisabled: false
  }

  const user = new User(cookie)
  expect(user).toBeInstanceOf(User)
  expect(user.id).toBe('1')
  expect(user.firstName).toBe('John')
  expect(user.lastName).toBe('Doe')
  expect(user.username).toBe('johndoe')
  expect(user.roles).toEqual([ 'foobar' ])
  expect(user.permissions).toEqual([ 'foo', 'bar' ])
  expect(user.isDeveloper).toBe(false)
  expect(user.isDisabled).toBe(false)
  expect(user.hasPermission('unallowed')).toBe(false)
  expect(user.hasPermission('foo')).toBe(true)
  expect(user.isPermitted('foo')).toBe(true)
  expect(user.isPermitted('unallowed')).toBe(false)
  expect(user.isPermitted({ or: ['foo', 'unallowed'] })).toBe(true)
  expect(user.isPermitted({ and: ['foo', 'bar'] })).toBe(true)
  expect(user.isPermitted({ and: ['foo', 'unallowed'] })).toBe(false)
})

describe('getLoggedInUser', () => {
  test('returns undefined when no user cookie is present', () => {
    const noUserCookie = ''
    const user = getLoggedInUser(noUserCookie)
    expect(user).toBe(undefined)
  })

  test('returns a User instance when a valid user cookie is present', () => {
    const validUserCookie = encodeURIComponent(JSON.stringify({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      roles: [ 'foobar' ],
      permissions: [ 'foo', 'bar' ],
      isDeveloper: false,
      isDisabled: false
    }))
    const user = getLoggedInUser(`user=${validUserCookie}`)
    expect(user).toBeInstanceOf(User)
    expect(user?.id).toBe('1')
    expect(user?.firstName).toBe('John')
    expect(user?.lastName).toBe('Doe')
    expect(user?.username).toBe('johndoe')
    expect(user?.roles).toEqual([ 'foobar' ])
    expect(user?.permissions).toEqual([ 'foo', 'bar' ])
    expect(user?.isDeveloper).toBe(false)
    expect(user?.isDisabled).toBe(false)
  })

  test('returns undefined when an invalid user cookie is present', () => {
    const invalidUserCookie = 'user=invalid'
    const user = getLoggedInUser(invalidUserCookie)
    expect(user).toBe(undefined)
  })

})
