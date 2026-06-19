import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { AuthSession, User } from '../../infrastructure/db/generated/prisma/client'
import type { AuthSessionWithUser, RefreshTokenPayload, SessionTokenResult } from './auth.types'
import { AuthError } from './auth.error'

const registerUserWithWorkspaceAndSessionMock = jest.fn()
const isUniqueConstraintErrorMock = jest.fn()
const findUserByEmailMock = jest.fn()
const createSessionMock = jest.fn()
const findActiveSessionWithUserMock = jest.fn()
const findActiveSessionsByUserIdMock = jest.fn()
const updateSessionMetadataMock = jest.fn()
const revokeSessionMock = jest.fn()
const revokeAllUserSessionsMock = jest.fn()
const findUserByIdMock = jest.fn()
const findDefaultWorkspaceMembershipMock = jest.fn()
const isRefreshTokenBlacklistedMock = jest.fn()
const blacklistRefreshSessionMock = jest.fn()
const blacklistRefreshSessionsMock = jest.fn()
const createRefreshTokenMock = jest.fn()
const verifyRefreshTokenMock = jest.fn()
const signAccessTokenMock = jest.fn()
const verifyAccessTokenMock = jest.fn()
const hashMock = jest.fn()
const compareMock = jest.fn()

jest.unstable_mockModule('./auth.repository', () => ({
  registerUserWithWorkspaceAndSession: registerUserWithWorkspaceAndSessionMock,
  isUniqueConstraintError: isUniqueConstraintErrorMock,
  findUserByEmail: findUserByEmailMock,
  createSession: createSessionMock,
  findActiveSessionWithUser: findActiveSessionWithUserMock,
  findActiveSessionsByUserId: findActiveSessionsByUserIdMock,
  updateSessionMetadata: updateSessionMetadataMock,
  revokeSession: revokeSessionMock,
  revokeAllUserSessions: revokeAllUserSessionsMock,
  findUserById: findUserByIdMock,
  findDefaultWorkspaceMembership: findDefaultWorkspaceMembershipMock
}))

jest.unstable_mockModule('./auth.blacklist', () => ({
  isRefreshTokenBlacklisted: isRefreshTokenBlacklistedMock,
  blacklistRefreshSession: blacklistRefreshSessionMock,
  blacklistRefreshSessions: blacklistRefreshSessionsMock
}))

jest.unstable_mockModule('./auth.tokens', () => ({
  createRefreshToken: createRefreshTokenMock,
  verifyRefreshToken: verifyRefreshTokenMock,
  signAccessToken: signAccessTokenMock,
  verifyAccessToken: verifyAccessTokenMock
}))

jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash: hashMock,
    compare: compareMock
  }
}))

const authService = await import('./auth.service')

const userId = '123e4567-e89b-12d3-a456-426614174000'
const workspaceId = '123e4567-e89b-12d3-a456-426614174030'
const sessionId = '123e4567-e89b-12d3-a456-426614174010'
const jti = '123e4567-e89b-12d3-a456-426614174020'
const expiresAt = new Date(Date.now() + 60_000)

const createUser = (overrides: Partial<User> = {}): User => ({
  id: userId,
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  fullName: null,
  avatarUrl: null,
  role: 'USER',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const createSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  id: sessionId,
  userId,
  jti,
  userAgent: 'jest',
  ipAddress: '127.0.0.1',
  expiresAt,
  revokedAt: null,
  lastUsedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const createRefreshTokenResult = (): SessionTokenResult => ({
  jti,
  refreshToken: 'refresh-token',
  refreshExpiresAt: expiresAt
})

const createRefreshPayload = (): RefreshTokenPayload => ({
  sub: userId,
  jti,
  type: 'refresh',
  exp: Math.floor(expiresAt.getTime() / 1000)
})

beforeEach(() => {
  jest.resetAllMocks()
  hashMock.mockResolvedValue('hashed-password')
  compareMock.mockResolvedValue(true)
  createRefreshTokenMock.mockReturnValue(createRefreshTokenResult())
  verifyRefreshTokenMock.mockReturnValue(createRefreshPayload())
  signAccessTokenMock.mockReturnValue('access-token')
  isUniqueConstraintErrorMock.mockReturnValue(false)
  isRefreshTokenBlacklistedMock.mockResolvedValue(false)
  blacklistRefreshSessionMock.mockResolvedValue(undefined)
  blacklistRefreshSessionsMock.mockResolvedValue(undefined)
  createSessionMock.mockResolvedValue(createSession())
  updateSessionMetadataMock.mockResolvedValue(createSession())
  revokeSessionMock.mockResolvedValue(undefined)
  revokeAllUserSessionsMock.mockResolvedValue(undefined)
  findDefaultWorkspaceMembershipMock.mockResolvedValue({
    id: '123e4567-e89b-12d3-a456-426614174040',
    userId,
    workspaceId,
    role: 'OWNER',
    createdAt: new Date()
  })
})

describe('auth service', () => {
  it('registers the user, workspace, owner membership, and session through one repository transaction', async () => {
    const user = createUser()
    registerUserWithWorkspaceAndSessionMock.mockResolvedValue({
      user,
      workspaceId
    })

    const result = await authService.register(
      {
        email: 'user@example.com',
        password: 'Password1'
      },
      {
        userAgent: 'jest',
        ipAddress: '127.0.0.1'
      }
    )

    expect(registerUserWithWorkspaceAndSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        session: expect.objectContaining({
          jti,
          userAgent: 'jest',
          ipAddress: '127.0.0.1',
          expiresAt
        })
      })
    )
    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshExpiresAt: expiresAt,
      user,
      workspaceId
    })
  })

  it('returns conflict when registration finds an existing email', async () => {
    registerUserWithWorkspaceAndSessionMock.mockResolvedValue(null)

    await expect(
      authService.register(
        {
          email: 'user@example.com',
          password: 'Password1'
        },
        {}
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT'
    })
  })

  it('maps a concurrent email unique conflict to the auth conflict response', async () => {
    registerUserWithWorkspaceAndSessionMock.mockRejectedValue(new Error('P2002'))
    isUniqueConstraintErrorMock.mockReturnValue(true)

    await expect(
      authService.register(
        {
          email: 'user@example.com',
          password: 'Password1'
        },
        {}
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT'
    })
  })

  it('rejects invalid credentials and disabled users without revealing account state', async () => {
    findUserByEmailMock.mockResolvedValueOnce(null)
    await expect(authService.login({ email: 'user@example.com', password: 'Password1' }, {})).rejects.toMatchObject({
      statusCode: 401
    })

    findUserByEmailMock.mockResolvedValueOnce(createUser({ status: 'DISABLED' }))
    await expect(authService.login({ email: 'user@example.com', password: 'Password1' }, {})).rejects.toMatchObject({
      statusCode: 401
    })

    findUserByEmailMock.mockResolvedValueOnce(createUser())
    compareMock.mockResolvedValueOnce(false)
    await expect(authService.login({ email: 'user@example.com', password: 'wrong' }, {})).rejects.toMatchObject({
      statusCode: 401
    })
  })

  it('creates a DB session and returns a refresh JWT on login', async () => {
    const user = createUser()
    findUserByEmailMock.mockResolvedValue(user)

    const result = await authService.login({ email: user.email, password: 'Password1' }, {})

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        jti,
        expiresAt
      })
    )
    expect(result.refreshToken).toBe('refresh-token')
    expect(result.workspaceId).toBe(workspaceId)
  })

  it('rejects login when the user has no workspace membership', async () => {
    findUserByEmailMock.mockResolvedValue(createUser())
    findDefaultWorkspaceMembershipMock.mockResolvedValue(null)

    await expect(authService.login({ email: 'user@example.com', password: 'Password1' }, {})).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'User does not belong to a workspace'
    })
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it('returns the authenticated user with the default workspace', async () => {
    findUserByIdMock.mockResolvedValue(createUser())
    verifyAccessTokenMock.mockReturnValue({
      type: 'access',
      userId
    })

    await expect(authService.getAuthenticatedUser('access-token')).resolves.toMatchObject({
      id: userId,
      workspaceId
    })
  })

  it('refreshes only the access token when the JWT session is active', async () => {
    const session: AuthSessionWithUser = {
      ...createSession(),
      user: createUser()
    }
    findActiveSessionWithUserMock.mockResolvedValue(session)

    const result = await authService.refresh('refresh-token', {
      userAgent: 'updated-agent',
      ipAddress: '127.0.0.2'
    })

    expect(findActiveSessionWithUserMock).toHaveBeenCalledWith(jti, userId)
    expect(updateSessionMetadataMock).toHaveBeenCalledWith(sessionId, {
      userAgent: 'updated-agent',
      ipAddress: '127.0.0.2',
      lastUsedAt: expect.any(Date)
    })
    expect(result).toEqual({
      accessToken: 'access-token'
    })
  })

  it('rejects blacklisted or missing refresh sessions', async () => {
    isRefreshTokenBlacklistedMock.mockResolvedValueOnce(true)
    await expect(authService.refresh('refresh-token', {})).rejects.toMatchObject({
      statusCode: 401
    })

    isRefreshTokenBlacklistedMock.mockResolvedValueOnce(false)
    findActiveSessionWithUserMock.mockResolvedValueOnce(null)
    await expect(authService.refresh('refresh-token', {})).rejects.toMatchObject({
      statusCode: 401
    })
  })

  it('fails closed when the Redis blacklist is unavailable', async () => {
    isRefreshTokenBlacklistedMock.mockRejectedValue(AuthError.sessionStoreUnavailable())

    await expect(authService.refresh('refresh-token', {})).rejects.toMatchObject({
      statusCode: 503,
      code: 'AUTH_SESSION_STORE_UNAVAILABLE'
    })
    expect(findActiveSessionWithUserMock).not.toHaveBeenCalled()
  })

  it('blacklists and revokes a disabled user refresh session', async () => {
    const session: AuthSessionWithUser = {
      ...createSession(),
      user: createUser({ status: 'DISABLED' })
    }
    findActiveSessionWithUserMock.mockResolvedValue(session)

    await expect(authService.refresh('refresh-token', {})).rejects.toMatchObject({
      statusCode: 403
    })
    expect(blacklistRefreshSessionMock).toHaveBeenCalledWith(jti, expiresAt)
    expect(revokeSessionMock).toHaveBeenCalledWith(sessionId)
  })

  it('keeps logout idempotent for missing or malformed refresh tokens', async () => {
    await authService.logout()
    verifyRefreshTokenMock.mockImplementationOnce(() => {
      throw AuthError.unauthorized()
    })
    await authService.logout('malformed-token')

    expect(blacklistRefreshSessionMock).not.toHaveBeenCalled()
    expect(revokeSessionMock).not.toHaveBeenCalled()
  })

  it('blacklists and revokes the current refresh session on logout', async () => {
    findActiveSessionWithUserMock.mockResolvedValue({
      ...createSession(),
      user: createUser()
    })

    await authService.logout('refresh-token')

    expect(blacklistRefreshSessionMock).toHaveBeenCalledWith(jti, new Date(createRefreshPayload().exp * 1000))
    expect(revokeSessionMock).toHaveBeenCalledWith(sessionId)
  })

  it('blacklists all active sessions before revoking them on logout-all', async () => {
    const sessions = [createSession(), createSession({ id: '123e4567-e89b-12d3-a456-426614174011' })]
    findActiveSessionsByUserIdMock.mockResolvedValue(sessions)

    await authService.logoutAll(userId)

    expect(blacklistRefreshSessionsMock).toHaveBeenCalledWith(sessions)
    expect(revokeAllUserSessionsMock).toHaveBeenCalledWith(userId)
    expect(blacklistRefreshSessionsMock.mock.invocationCallOrder[0]).toBeLessThan(
      revokeAllUserSessionsMock.mock.invocationCallOrder[0]
    )
  })

  it('does not revoke DB sessions when logout-all cannot reach Redis', async () => {
    findActiveSessionsByUserIdMock.mockResolvedValue([createSession()])
    blacklistRefreshSessionsMock.mockRejectedValue(AuthError.sessionStoreUnavailable())

    await expect(authService.logoutAll(userId)).rejects.toMatchObject({
      statusCode: 503,
      code: 'AUTH_SESSION_STORE_UNAVAILABLE'
    })
    expect(revokeAllUserSessionsMock).not.toHaveBeenCalled()
  })
})
