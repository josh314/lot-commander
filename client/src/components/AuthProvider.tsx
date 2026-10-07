import { useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { getLoggedInUser, type User } from '../lib/auth'

export function AuthProvider({ children, user }: { children: React.ReactNode, user?: User }) {

  const [userState, _setUserState] = useState( () => user ?? getLoggedInUser() )

  return (
    <AuthContext value={userState}>
      {children}
    </AuthContext>
  )

}
