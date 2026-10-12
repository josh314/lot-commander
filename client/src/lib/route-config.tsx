import type { RouteObject } from 'react-router'

import type { User, Permission } from './auth'
import { RequirePermission } from '../components/RequirePermission'
import type { Layout, Page } from '../components/layout'

interface BaseNode {
  permission?: Permission
  nav?: { label: string, group?: NavGroupLabel, isAnchorTag?: boolean }
}

export interface LayoutNode extends BaseNode {
  children: RouteConfigNode[]
  layout: Layout
  path?: string
  page?: never
  index?: never
}

export interface PrefixNode extends BaseNode {
  path: string
  children: RouteConfigNode[]
  layout?: never
  page?: never
  index?: never
}

export interface IndexPageNode extends BaseNode {
  index: true
  page: Page
  path?: never
  layout?: never
  children?: never
}

export interface NormalPageNode extends BaseNode {
  path: string
  page: Page
  index?: never
  layout?: never
  children?: never
}

export type PageNode = IndexPageNode | NormalPageNode

export interface AnchorNode extends BaseNode {
  path: string
  nav: { label: string, group?: NavGroupLabel, isAnchorTag: true }
  layout?: never
  page?: never
  index?: never
  children?: never
}

export type RouteConfigNode = PrefixNode | LayoutNode | PageNode | AnchorNode

function joinPaths(prefix: string, segment?: string): string {
  if (!segment) return prefix
  return `${prefix}/${segment}`.replace(/\/{2,}/g, '/')
}

export function toRouteObject( node: RouteConfigNode ): RouteObject | undefined {
  const { path, index, layout, page, permission, children, nav } = node

  if (nav?.isAnchorTag) {
    return undefined
  }

  const Component = layout?.Component || page?.Component

  return {
    path,
    index,
    element: Component && (
      permission
        ? <RequirePermission permission={permission}><Component /></RequirePermission>
        : <Component />
    ),
    children: children && toRouteObjects(children),
  } as RouteObject
}

export function toRouteObjects(nodes: RouteConfigNode[]): RouteObject[] {
  return nodes
    .map(toRouteObject)
    .filter(route => route !== undefined)
}

export const NAV_GROUPS = ['Development', 'Production'] as const
export type NavGroupLabel = typeof NAV_GROUPS[number]
export interface NavLink { label: string; path: string; isAnchorTag?: boolean, permission?: Permission }
export interface NavGroup { label: string; items: NavLink[] }
export type NavEntry = NavLink | NavGroup

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry
}

export function buildNavItems(nodes: RouteConfigNode[], basePath = ''): NavEntry[] {
  const groups = new Map<string, NavGroup>()
  const entries: NavEntry[] = []

  function walk(list: RouteConfigNode[], prefix: string) {
    for (const node of list) {
      const path = joinPaths(prefix, node.path)
      if (node.nav) {
        const link: NavLink = { label: node.nav.label, path, isAnchorTag: node.nav.isAnchorTag, permission: node.permission }
        if (node.nav.group) {
          let group = groups.get(node.nav.group)
          if (!group) {
            group = { label: node.nav.group, items: [] }
            groups.set(node.nav.group, group)
            entries.push(group)
          }
          group.items.push(link)
        } else {
          entries.push(link)
        }
      }
      if (node.children) walk(node.children, path)
    }
  }

  walk(nodes, basePath)
  return entries
}

export function filterNavEntries(entries: NavEntry[], user: User | undefined): NavEntry[] {
  return entries
    .map(entry =>
      isNavGroup(entry)
        ? { ...entry, items: entry.items.filter(item => !item.permission || !!user?.isPermitted(item.permission)) }
        : entry
    )
    .filter(entry =>
      isNavGroup(entry) ? entry.items.length > 0 : !entry.permission || !!user?.isPermitted(entry.permission)
    )
}