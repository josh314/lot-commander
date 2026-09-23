import { ListLots } from './ListLots'
import type { RouteConfigNode } from '../../lib/route-config'

const routes: RouteConfigNode[] = [
  {
    path: '/lots',
    children: [
      {
        index: true,
        Component: ListLots,
        nav: {
          label: 'Lots',
          group: 'Production'
        },
        permission: 'VIEW_LOT'
      }
    ]
  }
]
export { routes };