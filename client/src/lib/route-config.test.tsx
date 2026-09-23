import { describe, expect, test } from 'vitest'
import {
  toRouteObjects,
  buildNavItems,
  isNavGroup,
  filterNavEntries,
  type RouteConfigNode,
  type NavEntry
} from './route-config'
import { User } from './auth'
import type { UserCookie } from '../schemas/user'

describe('toRouteObjects', () => {

  test('should throw an error if both index and children are present on the same node', () => {

    const badTree = [
      {
        index: true,
        children: [
          {
            path: '/child',
            Component: () => null
          }
        ]
      }
    ]

    expect(() => toRouteObjects(badTree)).toThrow()
  })

  test('should maintain the structure of the input tree', () => {

    const tree: RouteConfigNode[] = [
      {
        index: true,
        Component: () => null
      },
      {
        path: '/path1',
        Component: () => null
      },
      {
        path: '/path2',
        children: [
          {
            path: '/sub1',
            Component: () => null
          },
          {
            path: '/sub2',
            Component: () => null
          }
        ]
      }
    ]

    const routeObjects = toRouteObjects(tree)
    expect(routeObjects).toHaveLength(3)
    expect(routeObjects[0].children).toBeUndefined()
    expect(routeObjects[1].children).toBeUndefined()
    expect(routeObjects[2].children).toHaveLength(2)

  })

})

describe('buildNavItems', () => {

  test('Non-navigation routes should not appear', () => {

    const tree: RouteConfigNode[] = [
      {
        path: '/path-without-navigation',
        Component: () => null
      },
    ]

    expect(buildNavItems(tree)).toHaveLength(0)
  })

  test('Computed NavItems should contain the correct navigation labels', () => {

    const tree: RouteConfigNode[] = [
      {
        path: '/path-with-subpaths',
        children: [
          {
            path: '/sub1',
            Component: () => null,
            nav: {
              label: 'Label',
              group: 'Production'
            }
          },
          {
            path: '/sub2',
            Component: () => null,
          }
        ]
      }
    ]

    const navItems = buildNavItems(tree)
    const group = navItems[0];
    if( !isNavGroup(group)) throw new Error('Expected a NavGroup')
    expect(group.label).toBe('Production')
    expect(group.items).toHaveLength(1)
    expect(group.items[0].label).toBe('Label')

  })

})

describe('filterNavEntries', () => {

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

  const userDataCookie = encodeURIComponent(JSON.stringify(cookie))
  const user = new User( userDataCookie )

  test('NavItems with no permissions should always appear', () => {

    const navItems: NavEntry[] = [
      {
        label: 'Label1',
        path: '/path1',
      }
    ]

    const filteredNavEntries = filterNavEntries(navItems, user)
    expect(filteredNavEntries).toHaveLength(1)
  })

  test('NavItems with permissions should be filtered based on user permissions: simple permission', () => {

    const navItems1: NavEntry[] = [
      {
        label: 'Label1',
        path: '/path1',
        permission: 'foo'
      },
    ]
    const filteredNavEntries1 = filterNavEntries(navItems1, user)
    expect(filteredNavEntries1).toHaveLength(1)

    const navItems2: NavEntry[] = [
      {
        label: 'Label1',
        path: '/path1',
        permission: 'bat'
      },
    ]
    const filteredNavEntries2 = filterNavEntries(navItems2, user)
    expect(filteredNavEntries2).toHaveLength(0)
  })

  test('NavItems with permissions should be filtered based on user permissions: and operator', () => {

    const navItems1: NavEntry[] = [
      {
        label: 'Label1',
        path: '/path1',
        permission: { and: [ 'foo', 'bar' ] }
      }
    ]
    const filteredNavEntries1 = filterNavEntries(navItems1, user)
    expect(filteredNavEntries1).toHaveLength(1)

    const navItems2: NavEntry[] = [
      {
        label: 'Label1',
        path: '/path1',
        permission: { and: [ 'foo', 'bat' ] }
      }
    ]
    const filteredNavEntries2 = filterNavEntries(navItems2, user)
    expect(filteredNavEntries2).toHaveLength(0)
  })

  test('NavItems with permissions should be filtered based on user permissions: or operator', () => {

    const navItems1: NavEntry[] = [
      {
        label: 'Label1',
        path: '/path1',
        permission: { or: [ 'foo', 'bat' ] }
      }
    ]
    const filteredNavEntries1 = filterNavEntries(navItems1, user)
    expect(filteredNavEntries1).toHaveLength(1)


    const navItems2: NavEntry[] = [
      {
        label: 'Label1',
        path: '/path1',
        permission: { or: [ 'bat', 'baz' ] }
      }
    ]
    const filteredNavEntries2 = filterNavEntries(navItems2, user)
    expect(filteredNavEntries2).toHaveLength(0)
  })

})