import { useContext, type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { AuthContext } from '../contexts/AuthContext'
import type { Permission } from '../lib/auth'

interface RequirePermissionProps {
  permission: Permission
  children: ReactNode
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const user = useContext(AuthContext)

  if (!user?.isPermitted(permission)) {
    return <Navigate to="/" replace />
  }

  return children
}