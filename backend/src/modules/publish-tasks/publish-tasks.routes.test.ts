import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { PaginatedResult, PublishTaskData } from './publish-tasks.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const createPublishTaskMock = jest.fn<(userId: string, body: unknown) => Promise<PublishTaskData>>()
const listPublishTasksMock = jest.fn<(userId: string, query: unknown) => Promise<PaginatedResult<PublishTaskData>>>()
const getPublishTaskMock = jest.fn<(userId: string, publishTaskId: string) => Promise<PublishTaskData>>()
const updatePublishTaskMock =
  jest.fn<(userId: string, publishTaskId: string, body: unknown) => Promise<PublishTaskData>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./publish-tasks.service', () => ({
  createPublishTask: createPublishTaskMock,
  getPublishTask: getPublishTaskMock,
  listPublishTasks: listPublishTasksMock,
  updatePublishTask: updatePublishTaskMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const publishTaskId = '00000000-0000-4000-8000-000000000002'
const mediaId = '00000000-0000-4000-8000-000000000003'
const shortClipId = '00000000-0000-4000-8000-000000000004'
const platformAccountId = '00000000-0000-4000-8000-000000000005'
const now = new Date('2026-06-09T10:00:00.000Z')
const scheduledAt = new Date('2026-06-10T10:00:00.000Z')

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const createPublishTask = (overrides: Partial<PublishTaskData> = {}): PublishTaskData => ({
  id: publishTaskId,
  userId,
  mediaId,
  shortClipId: null,
  platformAccountId,
  jobId: null,
  platform: 'FACEBOOK',
  title: 'Video title',
  caption: 'Video caption',
  description: null,
  hashtags: ['#video'],
  status: 'DRAFT',
  scheduledAt: null,
  publishedAt: null,
  platformPostId: null,
  platformPostUrl: null,
  errorMessage: null,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

describe('publish task routes', () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset()
    createPublishTaskMock.mockReset()
    listPublishTasksMock.mockReset()
    getPublishTaskMock.mockReset()
    updatePublishTaskMock.mockReset()

    getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
    createPublishTaskMock.mockResolvedValue(createPublishTask())
    listPublishTasksMock.mockResolvedValue({
      items: [createPublishTask()],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    })
    getPublishTaskMock.mockResolvedValue(createPublishTask())
    updatePublishTaskMock.mockResolvedValue(createPublishTask({ title: 'Updated title' }))
  })

  it.each([
    ['GET', '/api/v1/publish-tasks'],
    ['POST', '/api/v1/publish-tasks'],
    ['GET', `/api/v1/publish-tasks/${publishTaskId}`],
    ['PATCH', `/api/v1/publish-tasks/${publishTaskId}`]
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'post' | 'patch'](path).send({})

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing access token'
      }
    })
  })

  it('creates a publish task', async () => {
    const response = await request(app)
      .post('/api/v1/publish-tasks')
      .set('Authorization', 'Bearer access-token')
      .send({
        mediaId,
        platform: 'FACEBOOK',
        platformAccountId,
        title: 'Video title',
        caption: 'Video caption',
        hashtags: ['#video'],
        scheduledAt: scheduledAt.toISOString()
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      success: true,
      data: {
        publishTask: {
          ...createPublishTask(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      }
    })
    expect(createPublishTaskMock).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        mediaId,
        platform: 'FACEBOOK',
        platformAccountId,
        scheduledAt
      })
    )
  })

  it.each([
    ['missing platform account', { mediaId, platform: 'FACEBOOK' }],
    ['both target ids', { mediaId, shortClipId, platform: 'FACEBOOK', platformAccountId }],
    ['neither target id', { platform: 'FACEBOOK', platformAccountId }],
    ['invalid platform', { mediaId, platform: 'INSTAGRAM', platformAccountId }]
  ])('returns validation errors for invalid create body: %s', async (_, body) => {
    const response = await request(app)
      .post('/api/v1/publish-tasks')
      .set('Authorization', 'Bearer access-token')
      .send(body)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      }
    })
  })

  it('lists publish tasks with filters and pagination', async () => {
    const response = await request(app)
      .get('/api/v1/publish-tasks')
      .query({
        platform: 'FACEBOOK',
        status: 'DRAFT',
        mediaId,
        platformAccountId,
        page: '1',
        limit: '10',
        sortBy: 'scheduledAt',
        sortOrder: 'asc'
      })
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [
          {
            ...createPublishTask(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
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
    expect(listPublishTasksMock).toHaveBeenCalledWith(userId, {
      platform: 'FACEBOOK',
      status: 'DRAFT',
      mediaId,
      platformAccountId,
      page: 1,
      limit: 10,
      sortBy: 'scheduledAt',
      sortOrder: 'asc'
    })
  })

  it('returns validation errors for invalid list query and params', async () => {
    const invalidQueryResponse = await request(app)
      .get('/api/v1/publish-tasks')
      .query({ status: 'NOT_A_STATUS' })
      .set('Authorization', 'Bearer access-token')

    expect(invalidQueryResponse.status).toBe(400)

    const invalidParamsResponse = await request(app)
      .get('/api/v1/publish-tasks/not-a-uuid')
      .set('Authorization', 'Bearer access-token')

    expect(invalidParamsResponse.status).toBe(400)
  })

  it('gets a publish task detail', async () => {
    const response = await request(app)
      .get(`/api/v1/publish-tasks/${publishTaskId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body.data.publishTask).toMatchObject({
      id: publishTaskId,
      platform: 'FACEBOOK'
    })
    expect(getPublishTaskMock).toHaveBeenCalledWith(userId, publishTaskId)
  })

  it('updates a publish task', async () => {
    const response = await request(app)
      .patch(`/api/v1/publish-tasks/${publishTaskId}`)
      .set('Authorization', 'Bearer access-token')
      .send({
        title: 'Updated title',
        scheduledAt: null
      })

    expect(response.status).toBe(200)
    expect(response.body.data.publishTask).toMatchObject({
      id: publishTaskId,
      title: 'Updated title'
    })
    expect(updatePublishTaskMock).toHaveBeenCalledWith(userId, publishTaskId, {
      title: 'Updated title',
      scheduledAt: null
    })
  })

  it('returns validation errors for empty update bodies', async () => {
    const response = await request(app)
      .patch(`/api/v1/publish-tasks/${publishTaskId}`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      }
    })
  })
})
