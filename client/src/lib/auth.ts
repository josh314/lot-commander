import { type UserCookie, UserCookieSchema } from '../schemas/user'

export type Permission = string | { and?: Permission[]; or?: Permission[] };

export class User {
  id: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
  permissions: string[]
  isDeveloper?: boolean
  isDisabled?: boolean

  constructor( cookie: UserCookie ) {


    const { id, firstName, lastName, username, roles, permissions, isDeveloper, isDisabled } = cookie

    this.id = id
    this.firstName = firstName
    this.lastName = lastName
    this.username = username
    this.roles = roles
    this.permissions = permissions
    this.isDeveloper = isDeveloper
    this.isDisabled = isDisabled

  }

  hasPermission( permissionString: string ): boolean {
    return this.permissions.includes( permissionString )
  }

  isPermitted( permission: Permission ): boolean {
    if (typeof permission === 'string') {
      return this.hasPermission(permission)
    } else if (typeof permission === 'object') {
      if (permission.or) {
        return permission.or.some(p => this.isPermitted(p))
      }
      if (permission.and) {
        return permission.and.every(p => this.isPermitted(p))
      }
    }
    return false
  }

}

export function getLoggedInUser( cookie: string ): User | undefined {

  const match = cookie.match(/(?:^|; )user=([^;]*)/)
  if (!match) {
    return undefined
  }

  try {
    const parsedCookie = UserCookieSchema.parse(JSON.parse(decodeURIComponent(match[1])))
    return new User(parsedCookie)
  } catch {
    return undefined
  }

}