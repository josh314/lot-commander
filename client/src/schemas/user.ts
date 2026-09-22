import * as z from 'zod/v4'

export const UserCookieSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(1),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  isDeveloper: z.boolean().optional(),
  isDisabled: z.boolean().optional(),
})

export type UserCookie = z.infer<typeof UserCookieSchema>