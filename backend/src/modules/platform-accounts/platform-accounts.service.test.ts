import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { config } from '../../config'
import { Platform } from '../../infrastructure/db/generated/prisma/client'
import * as platformAccountsUtil from './platform-accounts.util'

const createPlatformOAuthStateMock = jest.fn<(data: unknown) => Promise<unknown>>()
const deleteStalePlatformOAuthStatesMock =
  jest.fn<(workspaceId: string, platform: Platform, now: Date) => Promise<number>>()
const findPlatformOAuthStateByHashAndPlatformMock =
  jest.fn<(stateHash: string, platform: Platform) => Promise<unknown>>()
const claimPlatformOAuthStateMock = jest.fn<(id: string, consumedAt: Date) => Promise<boolean>>()
const expireElapsedPlatformAccountsMock = jest.fn<(workspaceId: string, now: Date) => Promise<number>>()
const findPlatformAccountsByWorkspaceIdMock = jest.fn<(workspaceId: string) => Promise<unknown[]>>()
const findPlatformAccountByWorkspaceIdAndPlatformMock =
  jest.fn<(workspaceId: string, platform: Platform) => Promise<unknown>>()
const findPlatformAccountByIdMock = jest.fn<(id: string) => Promise<unknown>>()
const upsertConnectedPlatformAccountMock = jest.fn<(input: unknown) => Promise<unknown>>()
const updatePlatformAccountCredentialsMock = jest.fn<(id: string, input: unknown) => Promise<unknown>>()
const expirePlatformAccountMock = jest.fn<(id: string) => Promise<unknown>>()
const revokePlatformAccountMock = jest.fn<(id: string) => Promise<unknown>>()
const getWorkspaceMembershipContextMock =
  jest.fn<(workspaceId: string, userId: string) => Promise<{ id: string; role: 'OWNER' | 'MEMBER' }>>()

const createYouTubeAuthUrlMock = jest.fn<(state: string) => string>()
const exchangeYouTubeCodeMock = jest.fn<(code: string) => Promise<unknown>>()
const getAuthenticatedYouTubeChannelMock = jest.fn<(tokens: unknown) => Promise<unknown>>()
const refreshYouTubeAccessTokenMock = jest.fn<(refreshToken: string) => Promise<unknown>>()
const revokeYouTubeTokenMock = jest.fn<(token: string) => Promise<void>>()
const createFacebookAuthUrlMock = jest.fn<(state: string) => string>()
const exchangeFacebookCodeMock = jest.fn<(code: string) => Promise<unknown>>()
const getAuthenticatedFacebookPageMock = jest.fn<(tokens: unknown) => Promise<unknown>>()
const revokeFacebookTokenMock = jest.fn<(token: string) => Promise<void>>()

class InvalidYouTubeRefreshTokenError extends Error {}

jest.unstable_mockModule('./platform-accounts.repository', () => ({
  claimPlatformOAuthState: claimPlatformOAuthStateMock,
  createPlatformOAuthState: createPlatformOAuthStateMock,
  deleteStalePlatformOAuthStates: deleteStalePlatformOAuthStatesMock,
  expireElapsedPlatformAccounts: expireElapsedPlatformAccountsMock,
  expirePlatformAccount: expirePlatformAccountMock,
  findPlatformAccountById: findPlatformAccountByIdMock,
  findPlatformAccountByWorkspaceIdAndPlatform: findPlatformAccountByWorkspaceIdAndPlatformMock,
  findPlatformAccountsByWorkspaceId: findPlatformAccountsByWorkspaceIdMock,
  findPlatformOAuthStateByHashAndPlatform: findPlatformOAuthStateByHashAndPlatformMock,
  revokePlatformAccount: revokePlatformAccountMock,
  updatePlatformAccountCredentials: updatePlatformAccountCredentialsMock,
  upsertConnectedPlatformAccount: upsertConnectedPlatformAccountMock
}))

jest.unstable_mockModule('../workspace/workspace.service', () => ({
  getWorkspaceMembershipContext: getWorkspaceMembershipContextMock
}))

jest.unstable_mockModule('../../infrastructure/google/youtube-oauth', () => ({
  InvalidYouTubeRefreshTokenError,
  createYouTubeAuthUrl: createYouTubeAuthUrlMock,
  exchangeYouTubeCode: exchangeYouTubeCodeMock,
  getAuthenticatedYouTubeChannel: getAuthenticatedYouTubeChannelMock,
  refreshYouTubeAccessToken: refreshYouTubeAccessTokenMock,
  revokeYouTubeToken: revokeYouTubeTokenMock
}))

jest.unstable_mockModule('../../infrastructure/facebook/facebook-oauth', () => ({
  createFacebookAuthUrl: createFacebookAuthUrlMock,
  exchangeFacebookCode: exchangeFacebookCodeMock,
  getAuthenticatedFacebookPage: getAuthenticatedFacebookPageMock,
  revokeFacebookToken: revokeFacebookTokenMock
}))

const platformAccountsService = await import('./platform-accounts.service')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000010'
const otherWorkspaceId = '00000000-0000-4000-8000-000000000011'
const accountId = '00000000-0000-4000-8000-000000000003'
const now = new Date('2026-06-08T16:00:00.000Z')

const createOAuthStateRecord = (overrides: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-000000000002',
  workspaceId,
  initiatedByUserId: userId,
  platform: Platform.YOUTUBE,
  stateHash: platformAccountsUtil.hashOAuthState('oauth-state'),
  expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
  consumedAt: null,
  createdAt: now,
  ...overrides
})

const createPlatformAccountRecord = (overrides: Record<string, unknown> = {}) => ({
  id: accountId,
  workspaceId,
  connectedByUserId: userId,
  platform: Platform.YOUTUBE,
  accountName: 'VidPilot Channel',
  platformUserId: 'UC1234567890',
  accessTokenEncrypted: platformAccountsUtil.encryptToken('existing-access-token'),
  refreshTokenEncrypted: platformAccountsUtil.encryptToken('existing-refresh-token'),
  tokenLast4: 'oken',
  expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  status: 'CONNECTED',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

describe('platform account service', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now)

    for (const mock of [
      claimPlatformOAuthStateMock,
      createPlatformOAuthStateMock,
      deleteStalePlatformOAuthStatesMock,
      expireElapsedPlatformAccountsMock,
      expirePlatformAccountMock,
      findPlatformAccountByIdMock,
      findPlatformAccountByWorkspaceIdAndPlatformMock,
      findPlatformAccountsByWorkspaceIdMock,
      findPlatformOAuthStateByHashAndPlatformMock,
      revokePlatformAccountMock,
      updatePlatformAccountCredentialsMock,
      upsertConnectedPlatformAccountMock,
      getWorkspaceMembershipContextMock,
      createYouTubeAuthUrlMock,
      exchangeYouTubeCodeMock,
      getAuthenticatedYouTubeChannelMock,
      refreshYouTubeAccessTokenMock,
      revokeYouTubeTokenMock,
      createFacebookAuthUrlMock,
      exchangeFacebookCodeMock,
      getAuthenticatedFacebookPageMock,
      revokeFacebookTokenMock
    ]) {
      mock.mockReset()
    }

    createPlatformOAuthStateMock.mockResolvedValue(createOAuthStateRecord())
    deleteStalePlatformOAuthStatesMock.mockResolvedValue(0)
    findPlatformOAuthStateByHashAndPlatformMock.mockResolvedValue(createOAuthStateRecord())
    claimPlatformOAuthStateMock.mockResolvedValue(true)
    expireElapsedPlatformAccountsMock.mockResolvedValue(0)
    findPlatformAccountsByWorkspaceIdMock.mockResolvedValue([createPlatformAccountRecord()])
    findPlatformAccountByWorkspaceIdAndPlatformMock.mockResolvedValue(createPlatformAccountRecord())
    findPlatformAccountByIdMock.mockResolvedValue(createPlatformAccountRecord())
    upsertConnectedPlatformAccountMock.mockResolvedValue(createPlatformAccountRecord())
    updatePlatformAccountCredentialsMock.mockResolvedValue(createPlatformAccountRecord())
    expirePlatformAccountMock.mockResolvedValue(createPlatformAccountRecord({ status: 'EXPIRED' }))
    revokePlatformAccountMock.mockResolvedValue(createPlatformAccountRecord({ status: 'REVOKED' }))
    getWorkspaceMembershipContextMock.mockResolvedValue({ id: workspaceId, role: 'OWNER' })
    createYouTubeAuthUrlMock.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?state=test-state')
    createFacebookAuthUrlMock.mockReturnValue('https://www.facebook.com/v25.0/dialog/oauth?state=test-state')
    exchangeYouTubeCodeMock.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    })
    exchangeFacebookCodeMock.mockResolvedValue({
      accessToken: 'facebook-user-token',
      refreshToken: null,
      expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    })
    getAuthenticatedYouTubeChannelMock.mockResolvedValue({
      accountName: 'VidPilot Channel',
      platformUserId: 'UC1234567890'
    })
    getAuthenticatedFacebookPageMock.mockResolvedValue({
      accountName: 'VidPilot Page',
      platformUserId: '123456789',
      pageAccessToken: 'facebook-page-token'
    })
    refreshYouTubeAccessTokenMock.mockResolvedValue({
      accessToken: 'refreshed-access-token',
      refreshToken: 'existing-refresh-token',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    })
    revokeYouTubeTokenMock.mockResolvedValue()
    revokeFacebookTokenMock.mockResolvedValue()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('lists workspace accounts after synchronizing elapsed expirations', async () => {
    const result = await platformAccountsService.listPlatformAccounts(workspaceId)

    expect(expireElapsedPlatformAccountsMock).toHaveBeenCalledWith(workspaceId, now)
    expect(findPlatformAccountsByWorkspaceIdMock).toHaveBeenCalledWith(workspaceId)
    expect(result[0]).toMatchObject({ id: accountId, workspaceId, platform: 'YOUTUBE' })
  })

  it.each(['YOUTUBE', 'FACEBOOK'] as const)('creates a workspace %s OAuth state and auth URL', async (platform) => {
    await platformAccountsService.createPlatformConnection(workspaceId, userId, platform)

    expect(deleteStalePlatformOAuthStatesMock).toHaveBeenCalledWith(workspaceId, platform, now)
    expect(createPlatformOAuthStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        initiatedByUserId: userId,
        platform,
        expiresAt: new Date(now.getTime() + config.platform.oauthStateTtlMs)
      })
    )
  })

  it('claims state atomically and persists a YouTube account for its workspace', async () => {
    const result = await platformAccountsService.handlePlatformCallback({
      platform: 'YOUTUBE',
      query: { code: 'oauth-code', state: 'oauth-state' }
    })

    expect(claimPlatformOAuthStateMock).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000002', now)
    expect(getWorkspaceMembershipContextMock).toHaveBeenCalledWith(workspaceId, userId)
    expect(upsertConnectedPlatformAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        connectedByUserId: userId,
        platform: Platform.YOUTUBE
      })
    )
    expect(result.redirectUrl).toBe(platformAccountsUtil.buildPlatformOauthRedirectUrl('YOUTUBE', 'connected'))
  })

  it('rejects a concurrently consumed callback before exchanging tokens', async () => {
    claimPlatformOAuthStateMock.mockResolvedValue(false)

    await expect(
      platformAccountsService.handlePlatformCallback({
        platform: 'YOUTUBE',
        query: { code: 'oauth-code', state: 'oauth-state' }
      })
    ).rejects.toMatchObject({ code: 'PLATFORM_OAUTH_STATE_CONSUMED' })

    expect(exchangeYouTubeCodeMock).not.toHaveBeenCalled()
  })

  it('rejects callbacks when the initiator is no longer a workspace owner', async () => {
    getWorkspaceMembershipContextMock.mockResolvedValue({ id: workspaceId, role: 'MEMBER' })

    await expect(
      platformAccountsService.handlePlatformCallback({
        platform: 'YOUTUBE',
        query: { code: 'oauth-code', state: 'oauth-state' }
      })
    ).rejects.toMatchObject({ code: 'WORKSPACE_OWNER_REQUIRED' })

    expect(exchangeYouTubeCodeMock).not.toHaveBeenCalled()
  })

  it('stores a Facebook Page token on the shared workspace account', async () => {
    findPlatformOAuthStateByHashAndPlatformMock.mockResolvedValue(
      createOAuthStateRecord({ platform: Platform.FACEBOOK })
    )
    findPlatformAccountByWorkspaceIdAndPlatformMock.mockResolvedValue(null)

    await platformAccountsService.handlePlatformCallback({
      platform: 'FACEBOOK',
      query: { code: 'oauth-code', state: 'oauth-state' }
    })

    const input = upsertConnectedPlatformAccountMock.mock.calls[0]?.[0] as {
      workspaceId: string
      accessTokenEncrypted: string
      refreshTokenEncrypted: string
    }
    expect(input.workspaceId).toBe(workspaceId)
    expect(platformAccountsUtil.decryptToken(input.accessTokenEncrypted)).toBe('facebook-page-token')
    expect(platformAccountsUtil.decryptToken(input.refreshTokenEncrypted)).toBe('facebook-user-token')
  })

  it('reuses the existing YouTube refresh token when reconnect does not return one', async () => {
    exchangeYouTubeCodeMock.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: null,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    })

    await platformAccountsService.handlePlatformCallback({
      platform: 'YOUTUBE',
      query: { code: 'oauth-code', state: 'oauth-state' }
    })

    const input = upsertConnectedPlatformAccountMock.mock.calls[0]?.[0] as {
      refreshTokenEncrypted: string
    }
    expect(platformAccountsUtil.decryptToken(input.refreshTokenEncrypted)).toBe('existing-refresh-token')
  })

  it('refreshes a YouTube account before use when its access token is near expiry', async () => {
    findPlatformAccountByIdMock.mockResolvedValue(
      createPlatformAccountRecord({ expiresAt: new Date(now.getTime() + 60_000) })
    )

    await platformAccountsService.getUsablePlatformAccount(workspaceId, Platform.YOUTUBE, accountId)

    expect(refreshYouTubeAccessTokenMock).toHaveBeenCalledWith('existing-refresh-token')
    expect(updatePlatformAccountCredentialsMock).toHaveBeenCalledWith(
      accountId,
      expect.objectContaining({
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        tokenLast4: 'oken'
      })
    )
  })

  it('marks YouTube credentials expired when the refresh token is revoked', async () => {
    findPlatformAccountByIdMock.mockResolvedValue(
      createPlatformAccountRecord({ expiresAt: new Date(now.getTime() - 1) })
    )
    refreshYouTubeAccessTokenMock.mockRejectedValue(new InvalidYouTubeRefreshTokenError())

    await expect(
      platformAccountsService.getUsablePlatformAccount(workspaceId, Platform.YOUTUBE, accountId)
    ).rejects.toMatchObject({ code: 'PLATFORM_ACCOUNT_INVALID_STATE' })
    expect(expirePlatformAccountMock).toHaveBeenCalledWith(accountId)
  })

  it('does not expire an account for a transient YouTube refresh failure', async () => {
    findPlatformAccountByIdMock.mockResolvedValue(
      createPlatformAccountRecord({ expiresAt: new Date(now.getTime() - 1) })
    )
    refreshYouTubeAccessTokenMock.mockRejectedValue(new Error('network unavailable'))

    await expect(
      platformAccountsService.getUsablePlatformAccount(workspaceId, Platform.YOUTUBE, accountId)
    ).rejects.toMatchObject({ code: 'PLATFORM_CREDENTIAL_PROVIDER_UNAVAILABLE' })
    expect(expirePlatformAccountMock).not.toHaveBeenCalled()
  })

  it('expires Facebook credentials instead of trying to refresh them', async () => {
    findPlatformAccountByIdMock.mockResolvedValue(
      createPlatformAccountRecord({
        platform: Platform.FACEBOOK,
        expiresAt: new Date(now.getTime() - 1)
      })
    )

    await expect(
      platformAccountsService.getUsablePlatformAccount(workspaceId, Platform.FACEBOOK, accountId)
    ).rejects.toMatchObject({ code: 'PLATFORM_ACCOUNT_INVALID_STATE' })
    expect(expirePlatformAccountMock).toHaveBeenCalledWith(accountId)
  })

  it('rejects an account from another workspace', async () => {
    findPlatformAccountByIdMock.mockResolvedValue(createPlatformAccountRecord({ workspaceId: otherWorkspaceId }))

    await expect(
      platformAccountsService.getUsablePlatformAccount(workspaceId, Platform.YOUTUBE, accountId)
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' })
  })

  it('disconnects locally even if provider token revocation fails', async () => {
    revokeYouTubeTokenMock.mockRejectedValue(new Error('revocation failed'))

    await expect(platformAccountsService.disconnectPlatformAccount(workspaceId, 'YOUTUBE')).resolves.toBeUndefined()

    expect(findPlatformAccountByWorkspaceIdAndPlatformMock).toHaveBeenCalledWith(workspaceId, Platform.YOUTUBE)
    expect(revokePlatformAccountMock).toHaveBeenCalledWith(accountId)
  })
})
