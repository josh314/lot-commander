import { expect, test } from 'vitest'
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

  const user = new User(encodeURIComponent(JSON.stringify(cookie)))
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


test('Authentication tests', () => {
  const user = getLoggedInUser()
  expect(user).toBe(undefined)
})