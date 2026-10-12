import { describe, expect, test } from 'vitest'
import {
  toRouteObject,
  toRouteObjects,
  buildNavItems,
  isNavGroup,
  filterNavEntries
} from './route-config'
import type {
  RouteConfigNode,
  PrefixNode,
  LayoutNode,
  IndexPageNode,
  NormalPageNode,
  AnchorNode,
  NavEntry
} from './route-config'
import { User } from './auth'
import type { UserCookie } from '../schemas/user'
import { layout, page } from '../components/layout'
import { RequirePermission } from '../components/RequirePermission'

const dummyPage = page(() => null)
const dummyLayout = layout(() => null)

describe('toRouteObject', () => {

  test('permissioned nodes should render with RequirePermission', () => {
    const node: RouteConfigNode = {
      path: '/protected',
      page: dummyPage,
      permission: 'VIEW_PROTECTED'
    }
    const routeObject = toRouteObject(node)
    expect(routeObject).toBeDefined()
    expect((routeObject?.element as React.ReactElement)?.type).toBe(RequirePermission)
  })

  test('non-permissioned nodes should render without RequirePermission', () => {
    const node: RouteConfigNode = {
      path: '/unprotected',
      page: dummyPage
    }
    const routeObject = toRouteObject(node)
    expect(routeObject).toBeDefined()
    expect((routeObject?.element as React.ReactElement)?.type).not.toBe(RequirePermission)
  })

  test('should handle PrefixNode correctly', () => {
    const node: PrefixNode = {
      path: '/prefix',
      children: [
        { index: true, page: dummyPage }
      ]
    }
    const routeObject = toRouteObject(node)
    expect(routeObject).toBeDefined()
    expect(routeObject?.element).toBeUndefined()
    expect(routeObject?.children).toHaveLength(1)
  })

  test('should handle LayoutNode correctly', () => {
    const node: LayoutNode = {
      layout: dummyLayout,
      children: [
        { index: true, page: dummyPage }
      ]
    }
    const routeObject = toRouteObject(node)
    expect(routeObject).toBeDefined()
    expect(routeObject?.element).toBeTruthy()
    expect(routeObject?.children).toHaveLength(1)
  })

  test('should handle IndexPageNode correctly', () => {
    const node: IndexPageNode = {
      index: true,
      page: dummyPage
    }
    const routeObject = toRouteObject(node)
    expect(routeObject).toBeDefined()
    expect(routeObject?.element).toBeTruthy()
    expect(routeObject?.children).toBeUndefined()
  })

  test('should handle NormalPageNode correctly', () => {
    const node: NormalPageNode = {
      path: '/normal',
      page: dummyPage
    }
    const routeObject = toRouteObject(node)
    expect(routeObject).toBeDefined()
    expect(routeObject?.element).toBeTruthy()
    expect(routeObject?.children).toBeUndefined()
  })

  test('should return undefined for AnchorNode', () => {
    const node: AnchorNode = {
      path: '/external',
      nav: { label: 'External', isAnchorTag: true }
    }
    expect(toRouteObject(node)).toBeUndefined()
  })

})

describe('toRouteObjects', () => {

  test('should maintain the structure of the input tree', () => {

    const tree: RouteConfigNode[] = [
      {
        index: true,
        page: dummyPage
      },
      {
        path: '/path1',
        page: dummyPage
      },
      {
        path: '/path2',
        children: [
          {
            path: '/sub1',
            page: dummyPage
          },
          {
            path: '/sub2',
            page: dummyPage
          }
        ]
      }
    ]

    const routeObjects = toRouteObjects(tree)
    expect(routeObjects).toHaveLength(3)
    expect(routeObjects[0].children).toBeUndefined()
    expect(routeObjects[1].children).toBeUndefined()
    expect(routeObjects[2].children).toHaveLength(2)
    expect(routeObjects[2].element).toBeUndefined()

  })

  test('a layout node wraps its children and renders an element', () => {

    const tree: RouteConfigNode[] = [
      {
        layout: dummyLayout,
        children: [
          { index: true, page: dummyPage }
        ]
      }
    ]

    const routeObjects = toRouteObjects(tree)
    expect(routeObjects).toHaveLength(1)
    expect(routeObjects[0].element).toBeTruthy()
    expect(routeObjects[0].children).toHaveLength(1)
  })

  test('anchor nodes should not appear in route objects', () => {
    const tree: RouteConfigNode[] = [
      {
        path: '/internal',
        page: dummyPage
      },
      {
        path: '/external',
        nav: { label: 'External', isAnchorTag: true }
      }
    ]
    const routeObjects = toRouteObjects(tree)
    expect(routeObjects).toHaveLength(1)
  })

})

describe('buildNavItems', () => {

  test('Non-navigation routes should not appear', () => {

    const tree: RouteConfigNode[] = [
      {
        path: '/path-without-navigation',
        page: dummyPage
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
            page: dummyPage,
            nav: {
              label: 'Label',
              group: 'Production'
            }
          },
          {
            path: '/sub2',
            page: dummyPage,
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

  const user = new User( cookie )

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