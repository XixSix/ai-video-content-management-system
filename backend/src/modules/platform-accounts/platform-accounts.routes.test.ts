import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CreatePlatformConnectionResult,
  HandlePlatformCallbackResult,
  PlatformAccountData
} from './platform-accounts.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const getWorkspaceMembershipContextMock =
  jest.fn<(workspaceId: string, userId: string) => Promise<{ id: string; role: 'OWNER' | 'MEMBER' }>>()
const listPlatformAccountsMock = jest.fn<(workspaceId: string) => Promise<PlatformAccountData[]>>()
const createPlatformConnectionMock =
  jest.fn<(workspaceId: string, userId: string, platform: string) => Promise<CreatePlatformConnectionResult>>()
const handlePlatformCallbackMock = jest.fn<(input: unknown) => Promise<HandlePlatformCallbackResult>>()
const buildCallbackFailureRedirectUrlMock = jest.fn<(platform: string, code: string) => string>()
const disconnectPlatformAccountMock = jest.fn<(workspaceId: string, platform: string) => Promise<void>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('../workspace/workspace.service', () => ({
  getWorkspaceMembershipContext: getWorkspaceMembershipContextMock
}))

jest.unstable_mockModule('./platform-accounts.service', () => ({
  listPlatformAccounts: listPlatformAccountsMock,
  createPlatformConnection: createPlatformConnectionMock,
  handlePlatformCallback: handlePlatformCallbackMock,
  buildCallbackFailureRedirectUrl: buildCallbackFailureRedirectUrlMock,
  disconnectPlatformAccount: disconnectPlatformAccountMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000010'
const now = new Date('2026-06-08T15:30:00.000Z')
const platformAccountsPath = `/api/v1/workspaces/${workspaceId}/platform-accounts`

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const createAccount = (): PlatformAccountData => ({
  id: '00000000-0000-4000-8000-000000000002',
  workspaceId,
  platform: 'YOUTUBE',
  accountName: 'VidPilot Channel',
  platformUserId: 'UC1234567890',
  status: 'CONNECTED',
  expiresAt: now,
  createdAt: now,
  updatedAt: now
})

describe('platform account routes', () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset()
    getWorkspaceMembershipContextMock.mockReset()
    listPlatformAccountsMock.mockReset()
    createPlatformConnectionMock.mockReset()
    handlePlatformCallbackMock.mockReset()
    buildCallbackFailureRedirectUrlMock.mockReset()
    disconnectPlatformAccountMock.mockReset()

    getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
    getWorkspaceMembershipContextMock.mockResolvedValue({ id: workspaceId, role: 'OWNER' })
    listPlatformAccountsMock.mockResolvedValue([createAccount()])
    createPlatformConnectionMock.mockResolvedValue({
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=test-state'
    })
    handlePlatformCallbackMock.mockResolvedValue({
      redirectUrl: 'http://localhost:5173/settings/integrations?platform=YOUTUBE&status=connected'
    })
    buildCallbackFailureRedirectUrlMock.mockReturnValue(
      'http://localhost:5173/settings/integrations?platform=YOUTUBE&status=failed&code=PLATFORM_OAUTH_CALLBACK_FAILED'
    )
    disconnectPlatformAccountMock.mockResolvedValue()
  })

  it.each([
    ['GET', platformAccountsPath],
    ['POST', `${platformAccountsPath}/YOUTUBE/connect`],
    ['POST', `${platformAccountsPath}/FACEBOOK/connect`],
    ['DELETE', `${platformAccountsPath}/YOUTUBE`]
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'post' | 'delete'](path).send({})

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing access token'
      }
    })
  })

  it('lists connected platform accounts', async () => {
    getWorkspaceMembershipContextMock.mockResolvedValueOnce({ id: workspaceId, role: 'MEMBER' })

    const response = await request(app).get(platformAccountsPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        accounts: [
          {
            ...createAccount(),
            expiresAt: now.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          }
        ]
      }
    })
    expect(listPlatformAccountsMock).toHaveBeenCalledWith(workspaceId)
  })

  it('creates a YouTube connection URL', async () => {
    const response = await request(app)
      .post(`${platformAccountsPath}/YOUTUBE/connect`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=test-state'
      }
    })
    expect(createPlatformConnectionMock).toHaveBeenCalledWith(workspaceId, userId, 'YOUTUBE')
  })

  it('creates a Facebook connection URL', async () => {
    createPlatformConnectionMock.mockResolvedValue({
      authUrl: 'https://www.facebook.com/v25.0/dialog/oauth?state=test-state'
    })

    const response = await request(app)
      .post(`${platformAccountsPath}/FACEBOOK/connect`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        authUrl: 'https://www.facebook.com/v25.0/dialog/oauth?state=test-state'
      }
    })
    expect(createPlatformConnectionMock).toHaveBeenCalledWith(workspaceId, userId, 'FACEBOOK')
  })

  it('redirects a public OAuth callback on success', async () => {
    const response = await request(app).get('/api/v1/platform-accounts/YOUTUBE/callback').query({
      code: 'oauth-code',
      state: 'oauth-state',
      scope: 'youtube.upload youtube.readonly',
      authuser: '0'
    })

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe(
      'http://localhost:5173/settings/integrations?platform=YOUTUBE&status=connected'
    )
    expect(handlePlatformCallbackMock).toHaveBeenCalledWith({
      platform: 'YOUTUBE',
      query: {
        code: 'oauth-code',
        state: 'oauth-state',
        error: undefined,
        error_description: undefined
      }
    })
  })

  it('redirects OAuth callback failures to the frontend failure URL', async () => {
    handlePlatformCallbackMock.mockRejectedValue(new Error('oauth failed'))

    const response = await request(app).get('/api/v1/platform-accounts/YOUTUBE/callback').query({
      code: 'oauth-code',
      state: 'oauth-state'
    })

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe(
      'http://localhost:5173/settings/integrations?platform=YOUTUBE&status=failed&code=PLATFORM_OAUTH_CALLBACK_FAILED'
    )
    expect(buildCallbackFailureRedirectUrlMock).toHaveBeenCalledWith('YOUTUBE', 'PLATFORM_OAUTH_CALLBACK_FAILED')
  })

  it('returns validation errors for unsupported platforms', async () => {
    const response = await request(app)
      .post(`${platformAccountsPath}/facebook/connect`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      }
    })
  })

  it('disconnects a platform account', async () => {
    const response = await request(app)
      .delete(`${platformAccountsPath}/YOUTUBE`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        message: 'Platform account disconnected successfully'
      }
    })
    expect(disconnectPlatformAccountMock).toHaveBeenCalledWith(workspaceId, 'YOUTUBE')
  })

  it.each([
    ['POST', `${platformAccountsPath}/YOUTUBE/connect`],
    ['DELETE', `${platformAccountsPath}/YOUTUBE`]
  ])('%s %s requires workspace owner permission', async (method, path) => {
    getWorkspaceMembershipContextMock.mockResolvedValueOnce({ id: workspaceId, role: 'MEMBER' })

    const requester = request(app)
    const response = await requester[method.toLowerCase() as 'post' | 'delete'](path).set(
      'Authorization',
      'Bearer access-token'
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('WORKSPACE_OWNER_REQUIRED')
  })

  it('redirects malformed callback queries instead of returning JSON validation errors', async () => {
    const response = await request(app)
      .get('/api/v1/platform-accounts/YOUTUBE/callback')
      .query({
        code: ['one', 'two'],
        state: 'oauth-state'
      })

    expect(response.status).toBe(302)
    expect(buildCallbackFailureRedirectUrlMock).toHaveBeenCalledWith('YOUTUBE', 'PLATFORM_OAUTH_CALLBACK_INVALID')
  })
})
