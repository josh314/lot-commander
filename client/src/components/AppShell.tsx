import { useContext, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'

import { Outlet } from 'react-router'

import { HEADER_HEIGHT, Sidebar } from './Sidebar'
import { SidebarToggle, TAB_SIZE } from './SidebarToggle'

export function AppShell() {
  const user = useContext(AuthContext)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  if (!user) return null

  return (
    <div className="flex h-screen bg-paper text-ink">
      {isSidebarOpen && <Sidebar />}

      <SidebarToggle isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(open => !open)} />

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 pb-6" style={{ paddingTop: HEADER_HEIGHT + TAB_SIZE }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
