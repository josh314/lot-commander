import { UserCookieSchema } from '../schemas/user'

export class User {
  id: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
  permissions: string[]
  isDeveloper?: boolean
  isDisabled?: boolean

  constructor( cookie: string ) {

    const parsedCookie = UserCookieSchema.parse(JSON.parse(decodeURIComponent(cookie)))
    const { id, firstName, lastName, username, roles, permissions, isDeveloper, isDisabled } = parsedCookie

    this.id = id
    this.firstName = firstName
    this.lastName = lastName
    this.username = username
    this.roles = roles
    this.permissions = permissions
    this.isDeveloper = isDeveloper
    this.isDisabled = isDisabled

  }

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission)
  }

}

export function getLoggedInUser(): User | undefined {

  const match = document.cookie.match(/(?:^|; )user=([^;]*)/)
  if (!match) {
    return undefined
  }

  try {
    return new User(match[1])
  } catch {
    return undefined
  }

}