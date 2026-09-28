import type { RouteConfigNode } from '../../lib/route-config'
import { ListLots } from './ListLots'
import { LotDetails } from './LotDetails'

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
        permission: 'LIST_LOTS'
      },
      {
        path: ':id',
        Component: LotDetails,
        permission: 'VIEW_LOT'
      }
    ]
  },
]
export { routes };