import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { getLoggedInUser, type User } from '../lib/auth'

export function AuthProvider({ children, user }: { children: React.ReactNode, user?: User }) {

  const [userState, setUserState] = useState( () => user ?? getLoggedInUser() )

  const refreshUser = useCallback(() => {
    setUserState( getLoggedInUser() )
  }, [])

  const value = useMemo(() => ({ user: userState, refreshUser }), [userState, refreshUser])

  useEffect( () => {
    if( !userState || userState.isDisabled ) {
      window.location.href = '/login';
    }
  }, [userState])


  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  )

}
