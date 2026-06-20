import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

import type {
  AuthenticatedUser,
  AuthResult,
  AuthSessionWithUser,
  RefreshResult,
  RefreshTokenPayload,
  RequestMetadata,
  SessionTokenResult,
  WorkspaceContext
} from './auth.types'
import { createRefreshToken, signAccessToken, verifyAccessToken, verifyRefreshToken } from './auth.tokens'
import type { LoginBody, RegisterBody } from './auth.schema'
import { AuthError } from './auth.error'
import { config } from '../../config'
import { toAuthenticatedUser } from './auth.mapper'
import * as authRepo from './auth.repository'
import { UserStatus } from '../../infrastructure/db/generated/prisma/client'
import { blacklistRefreshSession, blacklistRefreshSessions, isRefreshTokenBlacklisted } from './auth.blacklist'

export const register = async (input: RegisterBody, metadata: RequestMetadata): Promise<AuthResult> => {
  const { email, password } = input
  const passwordHash: string = await bcrypt.hash(password, config.security.saltRounds)
  const userId: string = crypto.randomUUID()
  const session: SessionTokenResult = createRefreshToken(userId)
  let registeredUser

  try {
    registeredUser = await authRepo.registerUserWithWorkspaceAndSession({
      id: userId,
      email,
      passwordHash,
      session: {
        jti: session.jti,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        expiresAt: session.refreshExpiresAt,
        lastUsedAt: new Date()
      }
    })
  } catch (error: unknown) {
    if (authRepo.isUniqueConstraintError(error)) {
      throw AuthError.conflict('Email is already registered')
    }

    throw error
  }

  if (!registeredUser) {
    throw AuthError.conflict('Email is already registered')
  }

  const accessToken: string = signAccessToken(registeredUser.user.id)

  return {
    accessToken,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt,
    user: registeredUser.user,
    workspaceId: registeredUser.workspaceId
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

  const workspaceId = await getDefaultWorkspaceId(user.id)
  const session: SessionTokenResult = await createRefreshSession(user.id, metadata)

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt,
    user,
    workspaceId
  }
}

export const refresh = async (refreshToken: string, metadata: RequestMetadata): Promise<RefreshResult> => {
  const payload: RefreshTokenPayload = verifyRefreshToken(refreshToken)

  if (await isRefreshTokenBlacklisted(payload.jti)) {
    throw AuthError.unauthorized('Invalid refresh token')
  }

  const session: AuthSessionWithUser | null = await authRepo.findActiveSessionWithUser(payload.jti, payload.sub)

  if (!session) {
    throw AuthError.unauthorized('Invalid refresh token')
  }

  if (session.user.status !== UserStatus.ACTIVE) {
    await blacklistRefreshSession(session.jti, session.expiresAt)
    await authRepo.revokeSession(session.id)
    throw AuthError.forbidden('User account is disabled')
  }

  await authRepo.updateSessionMetadata(session.id, {
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    lastUsedAt: new Date()
  })

  return {
    accessToken: signAccessToken(session.user.id)
  }
}

export const logout = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) {
    return
  }

  let payload: RefreshTokenPayload

  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return
  }

  await blacklistRefreshSession(payload.jti, new Date(payload.exp * 1000))

  const session = await authRepo.findActiveSessionWithUser(payload.jti, payload.sub)
  if (session) {
    await authRepo.revokeSession(session.id)
  }
}

export const logoutAll = async (userId: string): Promise<void> => {
  const sessions = await authRepo.findActiveSessionsByUserId(userId)
  await blacklistRefreshSessions(sessions)
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

const getDefaultWorkspaceId = async (userId: string): Promise<string> => {
  const membership = await getDefaultWorkspaceMembership(userId)

  return membership.id
}

export const getDefaultWorkspaceMembership = async (userId: string): Promise<WorkspaceContext> => {
  const membership = await authRepo.findDefaultWorkspaceMembership(userId)

  if (!membership) {
    throw AuthError.forbidden('User does not belong to a workspace')
  }

  return {
    id: membership.workspaceId,
    role: membership.role
  }
}

const createRefreshSession = async (userId: string, metadata: RequestMetadata): Promise<SessionTokenResult> => {
  const session: SessionTokenResult = createRefreshToken(userId)

  await authRepo.createSession({
    userId,
    jti: session.jti,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    expiresAt: session.refreshExpiresAt,
    lastUsedAt: new Date()
  })

  return session
}
