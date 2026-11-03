import { layout } from '../components/layout'

import { AppShell } from '../components/AppShell'
import { mainRouteTree, footerRouteTree } from './route-trees'
import { type RouteConfigNode, toRouteObjects } from '../lib/route-config'

const tree: RouteConfigNode[] = [
  {
    layout: layout(AppShell),
    children: [...mainRouteTree, ...footerRouteTree],
  }
]

export const routes = toRouteObjects( tree )
