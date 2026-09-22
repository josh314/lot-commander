export interface UserCookie {
  id: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
  permissions: string[]
  isDeveloper?: boolean
}

export class User implements UserCookie {
  id: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
  permissions: string[]
  isDeveloper?: boolean

  constructor( cookie: string ) {

    const parsedCookie: UserCookie = JSON.parse(decodeURIComponent(cookie))
    const { id, firstName, lastName, username, roles, permissions, isDeveloper } = parsedCookie

    this.id = id
    this.firstName = firstName
    this.lastName = lastName
    this.username = username
    this.roles = roles
    this.permissions = permissions
    this.isDeveloper = isDeveloper

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