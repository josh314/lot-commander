import { type ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { Permission } from '../lib/auth'
import { useAuthUser } from '../hooks'

interface RequirePermissionProps {
  permission: Permission
  children: ReactNode
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const user = useAuthUser()

  if (!user?.isPermitted(permission)) {
    return <Navigate to="/" replace />
  }

  return children
}