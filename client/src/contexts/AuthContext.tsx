import { createContext } from 'react'
import { type User } from '../lib/auth'

export const AuthContext = createContext<User | undefined>(undefined)