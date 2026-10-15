import { page } from '../../components/layout';
import type { RouteConfigNode } from '../../lib/route-config'
import { StyleGuide } from './StyleGuide'

const routes: RouteConfigNode[] = [
  {
    path: '/style-guide',
    children: [
      {
        index: true,
        page: page(StyleGuide),
        nav: {
          label: 'Style Guide',
          group: 'Development'
        },
      }
    ]
  },
]
export { routes };