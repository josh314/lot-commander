import type { ComponentType } from 'react'
import type { RouteObject, LoaderFunction } from 'react-router'
import type { User, Permission } from './auth'

import { RequirePermission } from '../components/RequirePermission'


export const NAV_GROUPS = ['Production'] as const
export type NavGroupLabel = typeof NAV_GROUPS[number]

export interface RouteConfigNode {
  path?: string                // relative segment; omit for pathless layout/index nodes
  index?: boolean
  Component?: ComponentType
  loader?: LoaderFunction       // passed through untouched to the resulting RouteObject
  permission?: Permission      // gates both rendering and nav visibility
  nav?: {
    label: string
    group?: NavGroupLabel      // nests under a dropdown matching another node's group; omit for a top-level link
    isAnchorTag?: boolean
  }
  children?: RouteConfigNode[]
}

function joinPaths(prefix: string, segment?: string): string {
  if (!segment) return prefix
  return `${prefix}/${segment}`.replace(/\/{2,}/g, '/')
}

export function toRouteObjects(nodes: RouteConfigNode[]): RouteObject[] {
  return nodes
    .filter(node => !node.nav?.isAnchorTag)
    .map(({ path, index, Component, loader, permission, children }) => {

      // This function only runs at build time, so we just enforce the following constraints here so it fails loudly in development if the route config is incorrect.

      if (index && children) {
        throw new Error(
          `Route config error: node${path ? ` "${path}"` : ''} has both index:true and children — index routes cannot have children.`
        )
      }

      if (!Component && !index && !children) {
        throw new Error(
          `Route config error: node${path ? ` "${path}"` : ''} has no Component, index, or children — mark it nav.isAnchorTag if it's meant to link outside the SPA.`
        )
      }

      return {
        path,
        index,
        loader,
        element: Component && (
          permission
            ? <RequirePermission permission={permission}><Component /></RequirePermission>
            : <Component />
        ),
        children: children && toRouteObjects(children),
      } as RouteObject
    })
}

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