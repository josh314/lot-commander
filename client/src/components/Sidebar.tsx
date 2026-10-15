import { useMemo } from 'react'
import { Link, NavLink as RouterNavLink } from 'react-router'
import { buildNavItems, filterNavEntries, isNavGroup, type NavEntry, type NavLink } from '../lib/route-config'
import { footerNavTree, navTree } from '../routes'
import { useAuthUser } from '../hooks'

export const SIDEBAR_WIDTH = 240
export const HEADER_HEIGHT = 56

function NavAnchor({ item }: { item: NavLink }) {
  if (item.isAnchorTag) {
    return (
      <a href={item.path} className="flex h-9 items-center rounded px-3 text-sm text-muted hover:bg-white">
        {item.label}
      </a>
    )
  }

  return (
    <RouterNavLink
      to={item.path}
      className={({ isActive }) =>
        `flex h-9 items-center rounded border-l-2 px-3 text-sm ${
          isActive
            ? 'border-info bg-white font-medium text-ink'
            : 'border-transparent text-ink/80 hover:bg-white'
        }`
      }
    >
      {item.label}
    </RouterNavLink>
  )
}

function NavEntryList({ entries }: { entries: NavEntry[] }) {
  return entries.map(entry =>
    isNavGroup(entry) ? (
      <div key={entry.label}>
        <div className="px-3 pb-1 text-[11px] font-medium text-muted">{entry.label}</div>
        <div className="space-y-0.5">
          {entry.items.map(item => (
            <NavAnchor key={item.path} item={item} />
          ))}
        </div>
      </div>
    ) : (
      <NavAnchor key={entry.path} item={entry} />
    ),
  )
}

export function Sidebar() {
  const user = useAuthUser()
  const navEntries = useMemo(() => filterNavEntries(buildNavItems(navTree), user), [user])
  const footerEntries = useMemo(() => filterNavEntries(buildNavItems(footerNavTree), user), [user])

  return (
    <aside
      className="flex h-screen shrink-0 flex-col border-r border-line bg-shell"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="flex items-center border-b border-line px-4" style={{ height: HEADER_HEIGHT }}>
        <Link to="/" className="text-[15px] font-semibold tracking-tight text-ink">
          Lot Commander
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <NavEntryList entries={navEntries} />
      </nav>

      <div className="border-t border-line px-3 py-3">
        <NavEntryList entries={footerEntries} />
      </div>
    </aside>
  )
}
