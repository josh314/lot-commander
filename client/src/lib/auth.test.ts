import { expect, test } from 'vitest'
import { User, getLoggedInUser } from './auth'
import type { UserCookie } from '../schemas/user'

test('User class exists', () => {

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
})


test('Authentication tests', () => {
  const user = getLoggedInUser()
  expect(user).toBe(undefined)
})