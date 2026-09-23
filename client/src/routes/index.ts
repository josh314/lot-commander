import { AppShell } from '../components/AppShell';
import { HomePage } from '../features/home/HomePage'
import { ListLots } from '../features/lots/ListLots'

const routes = [
  {
    Component: AppShell,
    children: [
      {
        index: true,
        Component: HomePage
      },
      {
        path: '/lots',
        children: [
          {
            path: '',
            Component: ListLots
          }
        ]
      }
    ]
  }
]

export { routes };