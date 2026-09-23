import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

import { Outlet } from "react-router";

import { Navbar } from './Navbar'

export function AppShell( ) {

  const user = useContext(AuthContext)

  if(!user) return null

  return (
    <div>
      <Navbar />
      <Outlet />
    </div>
  )
}