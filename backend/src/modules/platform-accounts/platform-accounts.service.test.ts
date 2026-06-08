import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { config } from '../../config'
import { Platform } from '../../infrastructure/db/generated/prisma/client'
import * as platformAccountsUtil from './platform-accounts.util'

const createPlatformOAuthStateMock = jest.fn<(data: unknown) => Promise<unknown>>()
const findPlatformOAuthStateByHashAndPlatformMock =
  jest.fn<(stateHash: string, platform: Platform) => Promise<unknown>>()
const consumePlatformOAuthStateMock = jest.fn<(id: string, consumedAt: Date) => Promise<unknown>>()
const findPlatformAccountsByUserIdMock = jest.fn<(userId: string) => Promise<unknown[]>>()
const findPlatformAccountByUserIdAndPlatformMock = jest.fn<(userId: string, platform: Platform) => Promise<unknown>>()
const upsertConnectedPlatformAccountMock = jest.fn<(input: unknown) => Promise<unknown>>()
const revokePlatformAccountMock = jest.fn<(id: string) => Promise<unknown>>()

const createYouTubeAuthUrlMock = jest.fn<(state: string) => string>()
const exchangeYouTubeCodeMock = jest.fn<(code: string) => Promise<unknown>>()
const getAuthenticatedYouTubeChannelMock = jest.fn<(tokens: unknown) => Promise<unknown>>()
const revokeYouTubeTokenMock = jest.fn<(token: string) => Promise<void>>()

jest.unstable_mockModule('./platform-accounts.repository', () => ({
  createPlatformOAuthState: createPlatformOAuthStateMock,
  findPlatformOAuthStateByHashAndPlatform: findPlatformOAuthStateByHashAndPlatformMock,
  consumePlatformOAuthState: consumePlatformOAuthStateMock,
  findPlatformAccountsByUserId: findPlatformAccountsByUserIdMock,
  findPlatformAccountByUserIdAndPlatform: findPlatformAccountByUserIdAndPlatformMock,
  upsertConnectedPlatformAccount: upsertConnectedPlatformAccountMock,
  revokePlatformAccount: revokePlatformAccountMock
}))

jest.unstable_mockModule('../../infrastructure/google/youtube-oauth', () => ({
  createYouTubeAuthUrl: createYouTubeAuthUrlMock,
  exchangeYouTubeCode: exchangeYouTubeCodeMock,
  getAuthenticatedYouTubeChannel: getAuthenticatedYouTubeChannelMock,
  revokeYouTubeToken: revokeYouTubeTokenMock
}))

const platformAccountsService = await import('./platform-accounts.service')

const userId = '00000000-0000-4000-8000-000000000001'
const now = new Date('2026-06-08T16:00:00.000Z')

const createOAuthStateRecord = () => ({
  id: '00000000-0000-4000-8000-000000000002',
  userId,
  platform: Platform.YOUTUBE,
  stateHash: platformAccountsUtil.hashOAuthState('oauth-state'),
  expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
  consumedAt: null,
  createdAt: now
})

const createPlatformAccountRecord = (overrides: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-000000000003',
  userId,
  platform: Platform.YOUTUBE,
  accountName: 'VidPilot Channel',
  platformUserId: 'UC1234567890',
  accessTokenEncrypted: platformAccountsUtil.encryptToken('existing-access-token'),
  refreshTokenEncrypted: platformAccountsUtil.encryptToken('existing-refresh-token'),
  tokenLast4: 'oken',
  expiresAt: now,
  status: 'CONNECTED',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

describe('platform account service', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now)

    createPlatformOAuthStateMock.mockReset()
    findPlatformOAuthStateByHashAndPlatformMock.mockReset()
    consumePlatformOAuthStateMock.mockReset()
    findPlatformAccountsByUserIdMock.mockReset()
    findPlatformAccountByUserIdAndPlatformMock.mockReset()
    upsertConnectedPlatformAccountMock.mockReset()
    revokePlatformAccountMock.mockReset()
    createYouTubeAuthUrlMock.mockReset()
    exchangeYouTubeCodeMock.mockReset()
    getAuthenticatedYouTubeChannelMock.mockReset()
    revokeYouTubeTokenMock.mockReset()

    createPlatformOAuthStateMock.mockResolvedValue(createOAuthStateRecord())
    findPlatformOAuthStateByHashAndPlatformMock.mockResolvedValue(createOAuthStateRecord())
    consumePlatformOAuthStateMock.mockResolvedValue(createOAuthStateRecord())
    findPlatformAccountsByUserIdMock.mockResolvedValue([createPlatformAccountRecord()])
    findPlatformAccountByUserIdAndPlatformMock.mockResolvedValue(createPlatformAccountRecord())
    upsertConnectedPlatformAccountMock.mockResolvedValue(createPlatformAccountRecord())
    revokePlatformAccountMock.mockResolvedValue(createPlatformAccountRecord({ status: 'REVOKED' }))
    createYouTubeAuthUrlMock.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?state=test-state')
    exchangeYouTubeCodeMock.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    })
    getAuthenticatedYouTubeChannelMock.mockResolvedValue({
      accountName: 'VidPilot Channel',
      platformUserId: 'UC1234567890'
    })
    revokeYouTubeTokenMock.mockResolvedValue()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('lists non-revoked platform accounts', async () => {
    const result = await platformAccountsService.listPlatformAccounts(userId)

    expect(result).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000003',
        platform: 'YOUTUBE',
        accountName: 'VidPilot Channel',
        platformUserId: 'UC1234567890',
        status: 'CONNECTED',
        expiresAt: now,
        createdAt: now,
        updatedAt: now
      }
    ])
    expect(findPlatformAccountsByUserIdMock).toHaveBeenCalledWith(userId)
  })

  it('creates a YouTube OAuth state and auth URL', async () => {
    const result = await platformAccountsService.createPlatformConnection(userId, 'YOUTUBE')

    expect(result).toEqual({
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=test-state'
    })
    expect(createPlatformOAuthStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        platform: Platform.YOUTUBE,
        expiresAt: new Date(now.getTime() + config.platform.oauthStateTtlMs)
      })
    )
    expect(createYouTubeAuthUrlMock).toHaveBeenCalledWith(expect.any(String))
  })

  it('handles a successful YouTube OAuth callback', async () => {
    const result = await platformAccountsService.handlePlatformCallback({
      platform: 'YOUTUBE',
      query: {
        code: 'oauth-code',
        state: 'oauth-state'
      }
    })

    expect(result).toEqual({
      redirectUrl: 'http://localhost:5173/settings/integrations?platform=YOUTUBE&status=connected'
    })
    expect(findPlatformOAuthStateByHashAndPlatformMock).toHaveBeenCalledWith(
      platformAccountsUtil.hashOAuthState('oauth-state'),
      Platform.YOUTUBE
    )
    expect(consumePlatformOAuthStateMock).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000002', now)
    expect(exchangeYouTubeCodeMock).toHaveBeenCalledWith('oauth-code')
    expect(getAuthenticatedYouTubeChannelMock).toHaveBeenCalledWith({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    })
    expect(upsertConnectedPlatformAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        platform: Platform.YOUTUBE,
        accountName: 'VidPilot Channel',
        platformUserId: 'UC1234567890',
        tokenLast4: 'oken'
      })
    )
    const upsertInput = upsertConnectedPlatformAccountMock.mock.calls[0]?.[0] as {
      accessTokenEncrypted: string
      refreshTokenEncrypted: string | null
    }
    expect(upsertInput.accessTokenEncrypted).not.toBe('new-access-token')
    expect(platformAccountsUtil.decryptToken(upsertInput.accessTokenEncrypted)).toBe('new-access-token')
    expect(upsertInput.refreshTokenEncrypted).not.toBeNull()
    expect(platformAccountsUtil.decryptToken(upsertInput.refreshTokenEncrypted!)).toBe('new-refresh-token')
  })

  it('reuses the existing refresh token when Google does not return a new one', async () => {
    const existingAccount = createPlatformAccountRecord()
    exchangeYouTubeCodeMock.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: null,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    })
    findPlatformAccountByUserIdAndPlatformMock.mockResolvedValue(existingAccount)

    await platformAccountsService.handlePlatformCallback({
      platform: 'YOUTUBE',
      query: {
        code: 'oauth-code',
        state: 'oauth-state'
      }
    })

    const upsertInput = upsertConnectedPlatformAccountMock.mock.calls[0]?.[0] as {
      refreshTokenEncrypted: string | null
      tokenLast4: string | null
    }

    expect(upsertInput.refreshTokenEncrypted).not.toBeNull()
    expect(platformAccountsUtil.decryptToken(upsertInput.refreshTokenEncrypted!)).toBe('existing-refresh-token')
    expect(upsertInput.tokenLast4).toBe(existingAccount.tokenLast4)
  })

  it('disconnects accounts even if Google token revocation fails', async () => {
    revokeYouTubeTokenMock.mockRejectedValue(new Error('revocation failed'))

    await expect(platformAccountsService.disconnectPlatformAccount(userId, 'YOUTUBE')).resolves.toBeUndefined()

    expect(findPlatformAccountByUserIdAndPlatformMock).toHaveBeenCalledWith(userId, Platform.YOUTUBE)
    expect(revokeYouTubeTokenMock).toHaveBeenCalledWith('existing-refresh-token')
    expect(revokePlatformAccountMock).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000003')
  })

  it('returns without error when disconnecting an unknown account', async () => {
    findPlatformAccountByUserIdAndPlatformMock.mockResolvedValue(null)

    await expect(platformAccountsService.disconnectPlatformAccount(userId, 'YOUTUBE')).resolves.toBeUndefined()

    expect(revokePlatformAccountMock).not.toHaveBeenCalled()
  })
})
