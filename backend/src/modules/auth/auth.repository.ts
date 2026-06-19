import { prisma } from '../../infrastructure/db/prisma'
import {
  Prisma,
  WorkspaceMemberRole,
  type AuthSession,
  type User
} from '../../infrastructure/db/generated/prisma/client'
import type { AuthSessionWithUser } from './auth.types'

export interface CreateUserData {
  id: string
  email: string
  passwordHash: string
}

export interface CreateSessionData {
  userId: string
  jti: string
  userAgent?: string
  ipAddress?: string
  expiresAt: Date
  lastUsedAt: Date
}

export interface UpdateSessionMetadata {
  userAgent?: string
  ipAddress?: string
  lastUsedAt: Date
}

export interface RegisterUserData extends CreateUserData {
  session: Omit<CreateSessionData, 'userId'>
}

export const findUserByEmail = async (email: string): Promise<User | null> =>
  prisma.user.findUnique({ where: { email } })

export const findUserById = async (id: string): Promise<User | null> => prisma.user.findUnique({ where: { id } })

export const registerUserWithWorkspaceAndSession = async (data: RegisterUserData): Promise<User | null> =>
  prisma.$transaction(async (transaction) => {
    const existingUser = await transaction.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return null
    }

    const user = await transaction.user.create({
      data: {
        id: data.id,
        email: data.email,
        passwordHash: data.passwordHash
      }
    })

    await transaction.workspace.create({
      data: {
        ownerId: user.id,
        name: 'Workspace',
        slug: `workspace-${user.id.replaceAll('-', '')}`,
        members: {
          create: {
            userId: user.id,
            role: WorkspaceMemberRole.OWNER
          }
        }
      }
    })

    await transaction.authSession.create({
      data: {
        userId: user.id,
        ...data.session
      }
    })

    return user
  })

export const findActiveSessionWithUser = async (jti: string, userId: string): Promise<AuthSessionWithUser | null> =>
  prisma.authSession.findFirst({
    where: {
      jti,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  })

export const findActiveSessionsByUserId = async (userId: string): Promise<AuthSession[]> =>
  prisma.authSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  })

export const createSession = async (data: CreateSessionData): Promise<AuthSession> =>
  prisma.authSession.create({ data })

export const updateSessionMetadata = async (id: string, data: UpdateSessionMetadata): Promise<AuthSession> =>
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

export const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
