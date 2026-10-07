import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthUser() {
  const authContext = useContext(AuthContext)
  return authContext?.user
}