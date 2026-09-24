import { AppShell } from '../components/AppShell'
import { HomePage } from '../features/home/HomePage'
import { routes as lotsRoutes } from '../features/lots/routes'
import { type RouteConfigNode, toRouteObjects } from '../lib/route-config'

const mainRoutes: RouteConfigNode[] = [
  { index: true, Component: HomePage },
  ...lotsRoutes,
]

const footerRoutes: RouteConfigNode[] = [
  { path: '/logout', nav: { label: 'Logout', isAnchorTag: true } },
]

const tree: RouteConfigNode[] = [
  {
    Component: AppShell,
    children: [...mainRoutes, ...footerRoutes],
  },
]

export const routes = toRouteObjects( tree )

// Handed to Sidebar's nav-collecting function separately, as two independent trees:
// a node's tree membership IS its section (main scrollable nav vs. pinned footer nav),
// so a nav group can never end up split across both.
export const navTree = mainRoutes
export const footerNavTree = footerRoutes
