import { page } from '../components/layout'

import { HomePage } from '../features/home/HomePage'
import { routes as lotsRoutes } from '../features/lots/routes'
import { routes as styleGuideRoutes } from '../features/style-guide/routes'
import { type RouteConfigNode } from '../lib/route-config'


// Handed to Sidebar's nav-collecting function separately, as two independent trees:
// a node's tree membership IS its section (main scrollable nav vs. pinned footer nav),
// so a nav group can never end up split across both.

export const mainRouteTree: RouteConfigNode[] = [
  { index: true, page: page(HomePage) },
  ...lotsRoutes,
  ...(import.meta.env.DEV ? styleGuideRoutes : [])
]

export const footerRouteTree: RouteConfigNode[] = [
  { path: '/logout', nav: { label: 'Logout', isAnchorTag: true } },
]

