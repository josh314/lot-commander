import { createContext } from 'react'
import { type User, getLoggedInUser } from '../lib/auth'

export const AuthContext = createContext<User | undefined>(getLoggedInUser())