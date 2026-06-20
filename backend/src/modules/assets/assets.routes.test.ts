import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { AssetResponseData, CreateAssetDownloadUrlResult, PaginatedResult } from './assets.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const listAssetsMock = jest.fn<(userId: string, query: unknown) => Promise<PaginatedResult<AssetResponseData>>>()
const createDownloadUrlMock = jest.fn<(userId: string, assetId: string) => Promise<CreateAssetDownloadUrlResult>>()
const deleteAssetMock = jest.fn<(userId: string, assetId: string) => Promise<void>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./assets.service', () => ({
  createDownloadUrl: createDownloadUrlMock,
  deleteAsset: deleteAssetMock,
  listAssets: listAssetsMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const assetId = '00000000-0000-4000-8000-000000000002'
const transcriptId = '00000000-0000-4000-8000-000000000003'
const chapterId = '00000000-0000-4000-8000-000000000004'
const now = new Date('2026-06-07T10:00:00.000Z')

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const createAsset = (): AssetResponseData => ({
  id: assetId,
  transcriptId,
  chapterId: null,
  assetType: 'SUBTITLE_SRT',
  transcriptVersion: 2,
  mimeType: 'application/x-subrip',
  fileSizeBytes: '1024',
  metadata: { format: 'srt' },
  createdAt: now
})

describe('asset routes', () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset()
    listAssetsMock.mockReset()
    createDownloadUrlMock.mockReset()
    deleteAssetMock.mockReset()

    getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
    listAssetsMock.mockResolvedValue({
      items: [createAsset()],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    })
    createDownloadUrlMock.mockResolvedValue({
      url: 'https://storage.example.com/generated/subtitle.srt',
      expiresInSeconds: 900
    })
    deleteAssetMock.mockResolvedValue()
  })

  it.each([
    ['GET', '/api/v1/assets'],
    ['GET', `/api/v1/assets/${assetId}/download-url`],
    ['DELETE', `/api/v1/assets/${assetId}`]
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'delete'](path).send({})

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing access token'
      }
    })
  })

  it('lists assets with pagination and filters', async () => {
    const response = await request(app)
      .get('/api/v1/assets')
      .query({
        assetType: 'SUBTITLE_SRT',
        transcriptId,
        chapterId,
        page: '1',
        limit: '10'
      })
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [
          {
            ...createAsset(),
            createdAt: now.toISOString()
          }
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      }
    })
    expect(listAssetsMock).toHaveBeenCalledWith(userId, {
      assetType: 'SUBTITLE_SRT',
      transcriptId,
      chapterId,
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  })

  it('returns validation errors for invalid list query', async () => {
    const response = await request(app)
      .get('/api/v1/assets')
      .query({ limit: '51' })
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

  it('rejects original media as a generated asset type', async () => {
    const response = await request(app)
      .get('/api/v1/assets')
      .query({ assetType: 'ORIGINAL_MEDIA' })
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

  it('returns validation errors for invalid asset ids', async () => {
    const response = await request(app)
      .get('/api/v1/assets/not-a-uuid/download-url')
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

  it('creates an asset download url', async () => {
    const response = await request(app)
      .get(`/api/v1/assets/${assetId}/download-url`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        url: 'https://storage.example.com/generated/subtitle.srt',
        expiresInSeconds: 900
      }
    })
    expect(createDownloadUrlMock).toHaveBeenCalledWith(userId, assetId)
  })

  it('deletes an asset', async () => {
    const response = await request(app).delete(`/api/v1/assets/${assetId}`).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        message: 'Asset deleted successfully'
      }
    })
    expect(deleteAssetMock).toHaveBeenCalledWith(userId, assetId)
  })
})
