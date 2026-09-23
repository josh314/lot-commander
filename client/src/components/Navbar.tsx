import { useContext, useMemo } from 'react'
import { Link } from 'react-router'
import { AuthContext } from '../contexts/AuthContext'
import { buildNavItems, filterNavEntries, isNavGroup, type NavLink } from '../lib/route-config'
import { navTree } from '../routes'

function NavAnchor({ item } : { item: NavLink }) {
  return item.isAnchorTag ? <a href={item.path}>{item.label}</a> : <Link to={item.path}>{item.label}</Link>
}

export function Navbar() {
  const user = useContext(AuthContext)
  const items = useMemo(() => filterNavEntries(buildNavItems(navTree), user), [user])

  return (
    <nav>
      <Link to="/">Lot Commander</Link>
      {items.map(entry =>
        isNavGroup(entry) ? (
          <div key={entry.label}>
            {entry.label}
            { entry.items.map( item => <NavAnchor key={item.path} item={item} /> ) }
          </div>
        ) : (
          <NavAnchor key={entry.path} item={entry} />
        )
      )}
    </nav>
  )
}