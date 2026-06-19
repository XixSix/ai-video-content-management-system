import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { AuthSession } from '../../infrastructure/db/generated/prisma/client'

const existsMock = jest.fn()
const setMock = jest.fn()
const multiSetMock = jest.fn()
const multiExecMock = jest.fn()
const multiMock = jest.fn(() => ({
  set: multiSetMock,
  exec: multiExecMock
}))
const getRedisClientMock = jest.fn(() => ({
  exists: existsMock,
  set: setMock,
  multi: multiMock
}))

jest.unstable_mockModule('../../infrastructure/redis/client', () => ({
  getRedisClient: getRedisClientMock
}))

const { blacklistRefreshSession, blacklistRefreshSessions, isRefreshTokenBlacklisted } =
  await import('./auth.blacklist')

const createSession = (id: string, jti: string, expiresAt: Date): AuthSession => ({
  id,
  userId: '123e4567-e89b-12d3-a456-426614174000',
  jti,
  userAgent: null,
  ipAddress: null,
  expiresAt,
  revokedAt: null,
  lastUsedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

beforeEach(() => {
  jest.resetAllMocks()
  multiMock.mockReturnValue({
    set: multiSetMock,
    exec: multiExecMock
  })
  getRedisClientMock.mockReturnValue({
    exists: existsMock,
    set: setMock,
    multi: multiMock
  })
  existsMock.mockResolvedValue(0)
  setMock.mockResolvedValue('OK')
  multiSetMock.mockReturnThis()
  multiExecMock.mockResolvedValue([])
})

describe('auth refresh blacklist', () => {
  it('checks the namespaced jti key', async () => {
    existsMock.mockResolvedValue(1)

    await expect(isRefreshTokenBlacklisted('refresh-jti')).resolves.toBe(true)
    expect(existsMock).toHaveBeenCalledWith('auth:refresh:blacklist:refresh-jti')
  })

  it('stores a revoked jti only for the remaining token lifetime', async () => {
    const expiresAt = new Date(Date.now() + 30_000)

    await blacklistRefreshSession('refresh-jti', expiresAt)

    expect(setMock).toHaveBeenCalledWith('auth:refresh:blacklist:refresh-jti', '1', {
      expiration: {
        type: 'EX',
        value: expect.any(Number)
      }
    })
    const options = setMock.mock.calls[0][2] as { expiration: { value: number } }
    expect(options.expiration.value).toBeGreaterThanOrEqual(29)
    expect(options.expiration.value).toBeLessThanOrEqual(30)
  })

  it('blacklists active sessions through one Redis transaction', async () => {
    const sessions = [
      createSession('session-1', 'jti-1', new Date(Date.now() + 30_000)),
      createSession('session-2', 'jti-2', new Date(Date.now() + 60_000))
    ]

    await blacklistRefreshSessions(sessions)

    expect(multiSetMock).toHaveBeenCalledTimes(2)
    expect(multiExecMock).toHaveBeenCalledTimes(1)
  })

  it('fails closed when Redis is unavailable', async () => {
    existsMock.mockRejectedValue(new Error('Redis unavailable'))

    await expect(isRefreshTokenBlacklisted('refresh-jti')).rejects.toMatchObject({
      statusCode: 503,
      code: 'AUTH_SESSION_STORE_UNAVAILABLE'
    })
  })
})
