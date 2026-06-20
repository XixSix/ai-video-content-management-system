import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { Media } from '../../infrastructure/db/generated/prisma/client'
import type { CreateUploadUrlResult } from './media.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const createUploadUrlMock = jest.fn<(input: unknown) => Promise<CreateUploadUrlResult>>()
const completeUploadMock = jest.fn<(input: unknown) => Promise<{ media: Media }>>()
const abortUploadMock = jest.fn<(userId: string, mediaId: string) => Promise<{ message: string }>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./media.service', () => ({
  abortUpload: abortUploadMock,
  completeUpload: completeUploadMock,
  createUploadUrl: createUploadUrlMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const mediaId = '00000000-0000-4000-8000-000000000003'
const now = new Date('2026-06-19T10:00:00.000Z')

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE',
  workspaceId
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
    createUploadUrlMock.mockReset()
    completeUploadMock.mockReset()
    abortUploadMock.mockReset()

    getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
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
    abortUploadMock.mockResolvedValue({
      message: 'Media upload aborted successfully'
    })
  })

  it.each([
    ['GET', '/api/v1/media'],
    ['POST', '/api/v1/media/upload-url'],
    ['POST', `/api/v1/media/${mediaId}/complete-upload`],
    ['POST', `/api/v1/media/${mediaId}/abort-upload`],
    ['GET', `/api/v1/media/${mediaId}`],
    ['GET', `/api/v1/media/${mediaId}/preview-url`],
    ['GET', `/api/v1/media/${mediaId}/download-url`],
    ['PATCH', `/api/v1/media/${mediaId}`],
    ['DELETE', `/api/v1/media/${mediaId}`]
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

  it('creates a workspace-scoped upload URL', async () => {
    const response = await request(app)
      .post('/api/v1/media/upload-url')
      .set('Authorization', 'Bearer access-token')
      .send({
        workspaceId,
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

  it('requires workspaceId when creating an upload URL', async () => {
    const response = await request(app)
      .post('/api/v1/media/upload-url')
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
  })

  it('completes an upload with a 200 response and public media fields', async () => {
    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/complete-upload`)
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
      mediaId,
      parts: undefined,
      duration: 120.5,
      width: 1920,
      height: 1080
    })
  })

  it('validates the mediaId complete-upload path parameter', async () => {
    const response = await request(app)
      .post('/api/v1/media/not-a-uuid/complete-upload')
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
      .post(`/api/v1/media/${mediaId}/abort-upload`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        message: 'Media upload aborted successfully'
      }
    })
    expect(abortUploadMock).toHaveBeenCalledWith(userId, mediaId)
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
