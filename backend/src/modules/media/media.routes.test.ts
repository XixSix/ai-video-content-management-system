import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { WorkspaceError } from '../workspace/workspace.error'
import type { Media } from '../../infrastructure/db/generated/prisma/client'
import type {
  CreateUploadUrlResult,
  MediaDetailResponseData,
  MediaListItemResponseData,
  PaginatedResult
} from './media.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const getWorkspaceMembershipContextMock = jest.fn()
const createUploadUrlMock = jest.fn<(input: unknown) => Promise<CreateUploadUrlResult>>()
const completeUploadMock = jest.fn<(input: unknown) => Promise<{ media: Media }>>()
const listMediaMock =
  jest.fn<(workspaceId: string, query: unknown) => Promise<PaginatedResult<MediaListItemResponseData>>>()
const getMediaMock = jest.fn<(workspaceId: string, mediaId: string) => Promise<MediaDetailResponseData>>()
const abortUploadMock =
  jest.fn<(workspaceId: string, userId: string, mediaId: string) => Promise<{ message: string }>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('../workspace/workspace.service', () => ({
  getWorkspaceMembershipContext: getWorkspaceMembershipContextMock
}))

jest.unstable_mockModule('./media.service', () => ({
  abortUpload: abortUploadMock,
  completeUpload: completeUploadMock,
  createUploadUrl: createUploadUrlMock,
  getMedia: getMediaMock,
  listMedia: listMediaMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const mediaId = '00000000-0000-4000-8000-000000000003'
const mediaPath = `/api/v1/workspaces/${workspaceId}/media`
const now = new Date('2026-06-19T10:00:00.000Z')

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const media: Media = {
  id: mediaId,
  userId,
  workspaceId,
  type: 'VIDEO',
  title: 'Upload',
  description: null,
  originalFilename: 'upload.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: 'uploads/workspaces/workspace/users/user/videos/session/original.mp4',
  s3Region: 'us-east-1',
  s3Etag: '"etag"',
  uploadId: null,
  duration: null,
  fileSizeBytes: BigInt(1024),
  mimeType: 'video/mp4',
  width: null,
  height: null,
  metadata: null,
  status: 'UPLOADED',
  createdAt: now,
  updatedAt: now
}

describe('media routes', () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset()
    getWorkspaceMembershipContextMock.mockReset()
    createUploadUrlMock.mockReset()
    completeUploadMock.mockReset()
    listMediaMock.mockReset()
    getMediaMock.mockReset()
    abortUploadMock.mockReset()

    getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
    getWorkspaceMembershipContextMock.mockResolvedValue({
      id: workspaceId,
      role: 'MEMBER'
    })
    createUploadUrlMock.mockResolvedValue({
      mode: 'SINGLE',
      mediaId,
      url: 'https://storage.example.com/upload',
      headers: {
        'Content-Type': 'video/mp4'
      },
      expiresInSeconds: 900
    })
    completeUploadMock.mockResolvedValue({ media })
    listMediaMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    })
    getMediaMock.mockResolvedValue({
      id: mediaId,
      workspaceId,
      type: 'VIDEO',
      title: 'Upload',
      description: null,
      originalFilename: 'upload.mp4',
      duration: null,
      fileSizeBytes: '1024',
      mimeType: 'video/mp4',
      width: null,
      height: null,
      metadata: null,
      status: 'UPLOADED',
      createdAt: now,
      updatedAt: now,
      previews: {
        thumbnail: null,
        thumbnailSprites: [],
        waveformPeaks: null
      }
    })
    abortUploadMock.mockResolvedValue({
      message: 'Media upload aborted successfully'
    })
  })

  it.each([
    ['GET', mediaPath],
    ['POST', `${mediaPath}/upload-url`],
    ['POST', `${mediaPath}/${mediaId}/complete-upload`],
    ['POST', `${mediaPath}/${mediaId}/abort-upload`],
    ['GET', `${mediaPath}/${mediaId}`],
    ['GET', `${mediaPath}/${mediaId}/preview-url`],
    ['GET', `${mediaPath}/${mediaId}/download-url`],
    ['PATCH', `${mediaPath}/${mediaId}`],
    ['DELETE', `${mediaPath}/${mediaId}`]
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](path).send({})

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing access token'
      }
    })
  })

  it('returns media list items with generated thumbnails', async () => {
    listMediaMock.mockResolvedValue({
      items: [
        {
          id: mediaId,
          workspaceId,
          type: 'VIDEO',
          title: 'Upload',
          description: null,
          originalFilename: 'upload.mp4',
          duration: 120,
          fileSizeBytes: '1024',
          mimeType: 'video/mp4',
          width: 1920,
          height: 1080,
          metadata: null,
          status: 'UPLOADED',
          createdAt: now,
          updatedAt: now,
          thumbnail: {
            id: '00000000-0000-4000-8000-000000000004',
            url: 'https://storage.example.com/generated/thumbnail.jpg',
            assetType: 'THUMBNAIL',
            mimeType: 'image/jpeg',
            fileSizeBytes: '2048',
            metadata: { width: 320, height: 180 },
            expiresInSeconds: 900
          }
        }
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    })

    const response = await request(app).get(mediaPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body.data.items[0]).toMatchObject({
      id: mediaId,
      thumbnail: {
        id: '00000000-0000-4000-8000-000000000004',
        url: 'https://storage.example.com/generated/thumbnail.jpg'
      }
    })
    expect(listMediaMock).toHaveBeenCalledWith(workspaceId, {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  })

  it('returns preview assets with media details for Studio', async () => {
    getMediaMock.mockResolvedValue({
      id: mediaId,
      workspaceId,
      type: 'VIDEO',
      title: 'Upload',
      description: null,
      originalFilename: 'upload.mp4',
      duration: 120,
      fileSizeBytes: '1024',
      mimeType: 'video/mp4',
      width: 1920,
      height: 1080,
      metadata: null,
      status: 'UPLOADED',
      createdAt: now,
      updatedAt: now,
      previews: {
        thumbnail: null,
        thumbnailSprites: [
          {
            id: '00000000-0000-4000-8000-000000000005',
            url: 'https://storage.example.com/generated/sprite.jpg',
            assetType: 'THUMBNAIL_SPRITE',
            mimeType: 'image/jpeg',
            fileSizeBytes: '4096',
            metadata: { sheetIndex: 0 },
            expiresInSeconds: 900
          }
        ],
        waveformPeaks: {
          id: '00000000-0000-4000-8000-000000000006',
          url: 'https://storage.example.com/generated/waveform.json',
          assetType: 'WAVEFORM_PEAKS',
          mimeType: 'application/json',
          fileSizeBytes: '1024',
          metadata: null,
          expiresInSeconds: 900
        }
      }
    })

    const response = await request(app).get(`${mediaPath}/${mediaId}`).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body.data.media.previews).toMatchObject({
      thumbnail: null,
      thumbnailSprites: [{ assetType: 'THUMBNAIL_SPRITE' }],
      waveformPeaks: {
        assetType: 'WAVEFORM_PEAKS'
      }
    })
  })

  it('creates a workspace-scoped upload URL', async () => {
    const response = await request(app)
      .post(`${mediaPath}/upload-url`)
      .set('Authorization', 'Bearer access-token')
      .send({
        mediaType: 'VIDEO',
        originalFilename: 'upload.mp4',
        mimeType: 'video/mp4',
        fileSizeBytes: 1024
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      success: true,
      data: {
        mode: 'SINGLE',
        mediaId,
        url: 'https://storage.example.com/upload',
        headers: {
          'Content-Type': 'video/mp4'
        },
        expiresInSeconds: 900
      }
    })
    expect(createUploadUrlMock).toHaveBeenCalledWith({
      userId,
      workspaceId,
      mediaType: 'VIDEO',
      originalFilename: 'upload.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 1024,
      title: undefined,
      description: undefined
    })
  })

  it('validates workspaceId before creating an upload URL', async () => {
    const response = await request(app)
      .post('/api/v1/workspaces/not-a-uuid/media/upload-url')
      .set('Authorization', 'Bearer access-token')
      .send({
        mediaType: 'VIDEO',
        originalFilename: 'upload.mp4',
        mimeType: 'video/mp4',
        fileSizeBytes: 1024
      })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR'
      }
    })
    expect(getWorkspaceMembershipContextMock).not.toHaveBeenCalled()
    expect(createUploadUrlMock).not.toHaveBeenCalled()
  })

  it('rejects users outside the selected workspace before calling media services', async () => {
    getWorkspaceMembershipContextMock.mockRejectedValue(WorkspaceError.forbidden())

    const response = await request(app).get(mediaPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
    expect(createUploadUrlMock).not.toHaveBeenCalled()
    expect(completeUploadMock).not.toHaveBeenCalled()
    expect(abortUploadMock).not.toHaveBeenCalled()
  })

  it('completes an upload with a 200 response and public media fields', async () => {
    const response = await request(app)
      .post(`${mediaPath}/${mediaId}/complete-upload`)
      .set('Authorization', 'Bearer access-token')
      .send({
        duration: 120.5,
        width: 1920,
        height: 1080
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        media: {
          id: mediaId,
          workspaceId,
          type: 'VIDEO',
          title: 'Upload',
          description: null,
          originalFilename: 'upload.mp4',
          duration: null,
          fileSizeBytes: '1024',
          mimeType: 'video/mp4',
          width: null,
          height: null,
          metadata: null,
          status: 'UPLOADED',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      }
    })
    expect(completeUploadMock).toHaveBeenCalledWith({
      userId,
      workspaceId,
      mediaId,
      parts: undefined,
      duration: 120.5,
      width: 1920,
      height: 1080
    })
  })

  it('validates the mediaId complete-upload path parameter', async () => {
    const response = await request(app)
      .post(`${mediaPath}/not-a-uuid/complete-upload`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR'
      }
    })
    expect(completeUploadMock).not.toHaveBeenCalled()
  })

  it('aborts an upload by mediaId', async () => {
    const response = await request(app)
      .post(`${mediaPath}/${mediaId}/abort-upload`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        message: 'Media upload aborted successfully'
      }
    })
    expect(abortUploadMock).toHaveBeenCalledWith(workspaceId, userId, mediaId)
  })

  it('removes the legacy abort endpoint', async () => {
    const response = await request(app)
      .post('/api/v1/media/abort-upload')
      .set('Authorization', 'Bearer access-token')
      .send({
        bucket: 'vidpilot-media',
        key: 'uploads/legacy',
        multipartUploadId: 'legacy-upload'
      })

    expect(response.status).toBe(404)
  })

  it('removes the legacy complete endpoint', async () => {
    const response = await request(app)
      .post('/api/v1/media/complete-upload')
      .set('Authorization', 'Bearer access-token')
      .send({ mediaId })

    expect(response.status).toBe(404)
  })
})
