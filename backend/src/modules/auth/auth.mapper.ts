import type { User } from '../../infrastructure/db/generated/prisma/client'
import type { AuthenticatedUser } from './auth.types'

export const toAuthenticatedUser = (user: User, workspaceId: string): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
  workspaceId
})
