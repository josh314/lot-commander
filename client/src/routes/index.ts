import { AppShell } from '../components/AppShell'
import { HomePage } from '../features/home/HomePage'
import { routes as lotsRoutes } from '../features/lots/routes'
import { type RouteConfigNode, toRouteObjects } from '../lib/route-config'

const tree: RouteConfigNode[] = [
  {
    Component: AppShell,
    children: [
      { index: true, Component: HomePage },
      ...lotsRoutes,
      { path: '/logout', nav: { label: 'Logout', isAnchorTag: true } }
    ],
  },
]

export const routes = toRouteObjects( tree )
export const navTree = tree   // handed to Navbar's nav-collecting function separately
