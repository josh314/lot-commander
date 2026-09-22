import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

import { Navbar } from './Navbar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell( { children }: AppShellProps ) {

  const user = useContext(AuthContext)

  if(!user) return null

  return (
    <div>
      <Navbar />
      { children }
    </div>
  )
}