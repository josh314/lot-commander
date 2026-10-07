import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'

import { AuthProvider } from './AuthProvider'
import { User } from '../lib/auth'
describe('AuthProvider', () => {

  // Per-test mocking of window.location as jsdom does not allow direct assignment

  let originalLocation: PropertyDescriptor | undefined

  beforeEach(() => {
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      value: {
        href: ''
      },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    if (originalLocation) {
      Object.defineProperty(window, 'location', originalLocation)
    }
  })

  // tests

  test('Redirect on no user', () => {
    render(<AuthProvider><div>Test Content</div></AuthProvider>)
    expect(window.location.href).toBe('/login')
  })

  test('Normal user does not redirect', () => {

    const testUser: User = new User({
      id: '1',
      firstName: 'Foo',
      lastName: 'Bar',
      username: 'foobar',
      roles: [],
      permissions: [],
      isDeveloper: false,
      isDisabled: false
    })

    render(<AuthProvider user={testUser}><div>Test Content</div></AuthProvider>)
    expect(window.location.href).toBe('')
  })

  test('Disabled user redirects', () => {

    const testUser: User = new User({
      id: '1',
      firstName: 'Foo',
      lastName: 'Bar',
      username: 'foobar',
      roles: [],
      permissions: [],
      isDeveloper: false,
      isDisabled: true
    })

    render(<AuthProvider user={testUser}><div>Test Content</div></AuthProvider>)
    expect(window.location.href).toBe('/login')
  })

})

