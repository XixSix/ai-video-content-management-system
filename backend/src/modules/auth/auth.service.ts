import bcrypt from 'bcrypt'

import type {
  AuthenticatedUser,
  AuthResult,
  AuthSessionWithUser,
  RequestMetadata,
  SessionTokenResult
} from '../../types/auth'
import { generateRefreshToken, signAccessToken, verifyAccessToken } from '../../utils/tokens'
import type { LoginBody, RegisterBody } from './auth.schema'
import { AuthError } from './auth.error'
import { config } from '../../config'
import { getRefreshExpiresAt, toAuthenticatedUser } from '../../utils/auth.util'
import * as authRepo from './auth.repository'
import { UserStatus } from '../../infrastructure/db/generated/prisma/client'

export const register = async (input: RegisterBody, metadata: RequestMetadata): Promise<AuthResult> => {
  const { email, password } = input
  const existing = await authRepo.findUserByEmail(email)

  if (existing) {
    throw AuthError.conflict('Email is already registered')
  }

  const passwordHash: string = await bcrypt.hash(password, config.security.saltRounds)
  const user = await authRepo.createUser({ email, passwordHash })

  const session: SessionTokenResult = await createRefreshSession(user.id, metadata)
  const accessToken: string = signAccessToken(user.id)

  return {
    accessToken,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt,
    user
  }
}

export const login = async (input: LoginBody, metadata: RequestMetadata): Promise<AuthResult> => {
  const { email, password } = input
  const user = await authRepo.findUserByEmail(email)

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw AuthError.unauthorized('Invalid email or password')
  }

  const isPasswordValid: boolean = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    throw AuthError.unauthorized('Invalid email or password')
  }

  const session: SessionTokenResult = await createRefreshSession(user.id, metadata)

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt,
    user
  }
}

export const refresh = async (refreshToken: string, metadata: RequestMetadata): Promise<AuthResult> => {
  const session: AuthSessionWithUser | null = await authRepo.findActiveSessionWithUser(refreshToken)

  if (!session) {
    throw AuthError.unauthorized('Invalid refresh token')
  }

  if (session.user.status !== UserStatus.ACTIVE) {
    await authRepo.revokeSession(session.id)
    throw AuthError.forbidden('User account is disabled')
  }

  const nextRefreshToken: string = generateRefreshToken()
  const refreshExpiresAt: Date = getRefreshExpiresAt()

  await authRepo.updateSession(session.id, {
    refreshToken: nextRefreshToken,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    expiresAt: refreshExpiresAt,
    lastUsedAt: new Date()
  })

  return {
    accessToken: signAccessToken(session.user.id),
    refreshToken: nextRefreshToken,
    refreshExpiresAt,
    user: session.user
  }
}

export const logout = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) {
    return
  }

  const session = await authRepo.findActiveSessionByToken(refreshToken)

  if (!session) {
    return
  }

  await authRepo.revokeSession(session.id)
}

export const logoutAll = async (userId: string): Promise<void> => {
  await authRepo.revokeAllUserSessions(userId)
}

export const getAuthenticatedUser = async (accessToken: string): Promise<AuthenticatedUser> => {
  const payload = verifyAccessToken(accessToken)
  const user = await authRepo.findUserById(payload.userId)

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw AuthError.unauthorized('Invalid access token')
  }

  return toAuthenticatedUser(user)
}

// ---------------------------------------------------------------------------
// Internal helpers — contain logic, so they stay in service
// ---------------------------------------------------------------------------

const createRefreshSession = async (userId: string, metadata: RequestMetadata): Promise<SessionTokenResult> => {
  const refreshToken: string = generateRefreshToken()
  const refreshExpiresAt: Date = getRefreshExpiresAt()

  await authRepo.createSession({
    userId,
    refreshToken,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    expiresAt: refreshExpiresAt,
    lastUsedAt: new Date()
  })

  return { refreshToken, refreshExpiresAt }
}
