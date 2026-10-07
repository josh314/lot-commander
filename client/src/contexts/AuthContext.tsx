import { createContext } from 'react'
import { type User } from '../lib/auth'

type AuthContextType = { user: User | undefined, refreshUser: () => void } | undefined
export const AuthContext = createContext<AuthContextType>(undefined)