import { prisma } from '../../infrastructure/db/prisma'
import type { AuthSession, User } from '../../infrastructure/db/generated/prisma/client'
import type { AuthSessionWithUser } from '../../types/auth'

export interface CreateUserData {
  email: string
  passwordHash: string
}

export interface CreateSessionData {
  userId: string
  refreshToken: string
  userAgent?: string
  ipAddress?: string
  expiresAt: Date
  lastUsedAt: Date
}

export interface UpdateSessionData {
  refreshToken?: string
  userAgent?: string
  ipAddress?: string
  expiresAt?: Date
  lastUsedAt?: Date
}

export const findUserByEmail = async (email: string): Promise<User | null> =>
  prisma.user.findUnique({ where: { email } })

export const findUserById = async (id: string): Promise<User | null> => prisma.user.findUnique({ where: { id } })

export const createUser = async (data: CreateUserData): Promise<User> => prisma.user.create({ data })

export const findActiveSessionWithUser = async (refreshToken: string): Promise<AuthSessionWithUser | null> =>
  prisma.authSession.findFirst({
    where: {
      refreshToken,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  })

export const findActiveSessionByToken = async (refreshToken: string): Promise<AuthSession | null> =>
  prisma.authSession.findFirst({
    where: {
      refreshToken,
      revokedAt: null
    }
  })

export const createSession = async (data: CreateSessionData): Promise<AuthSession> =>
  prisma.authSession.create({ data })

export const updateSession = async (id: string, data: UpdateSessionData): Promise<AuthSession> =>
  prisma.authSession.update({ where: { id }, data })

export const revokeSession = async (id: string): Promise<void> => {
  await prisma.authSession.update({
    where: { id },
    data: { revokedAt: new Date() }
  })
}

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  })
}
