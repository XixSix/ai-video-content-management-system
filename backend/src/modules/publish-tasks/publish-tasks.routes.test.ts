import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { JobResponseData } from '../jobs/jobs.types'
import type { PaginatedResult, PublishTaskData } from './publish-tasks.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const createPublishTaskMock = jest.fn<(userId: string, body: unknown) => Promise<PublishTaskData>>()
const listPublishTasksMock = jest.fn<(userId: string, query: unknown) => Promise<PaginatedResult<PublishTaskData>>>()
const getPublishTaskMock = jest.fn<(userId: string, publishTaskId: string) => Promise<PublishTaskData>>()
const updatePublishTaskMock =
  jest.fn<(userId: string, publishTaskId: string, body: unknown) => Promise<PublishTaskData>>()
const publishPublishTaskMock = jest.fn<(userId: string, publishTaskId: string) => Promise<unknown>>()
const schedulePublishTaskMock = jest.fn<(userId: string, publishTaskId: string, body: unknown) => Promise<unknown>>()
const cancelPublishTaskMock = jest.fn<(userId: string, publishTaskId: string) => Promise<PublishTaskData>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./publish-tasks.service', () => ({
  cancelPublishTask: cancelPublishTaskMock,
  createPublishTask: createPublishTaskMock,
  getPublishTask: getPublishTaskMock,
  listPublishTasks: listPublishTasksMock,
  publishPublishTask: publishPublishTaskMock,
  schedulePublishTask: schedulePublishTaskMock,
  updatePublishTask: updatePublishTaskMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const publishTaskId = '00000000-0000-4000-8000-000000000002'
const jobId = '00000000-0000-4000-8000-000000000007'
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
  projectId: null,
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
  errorCode: null,
  errorMessage: null,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createJob = (overrides: Partial<JobResponseData> = {}): JobResponseData => ({
  id: jobId,
  mediaId,
  jobType: 'PUBLISH',
  status: 'PENDING',
  progress: 0,
  errorCode: null,
  errorMessage: null,
  output: null,
  attemptCount: 0,
  createdAt: now,
  updatedAt: now,
  startedAt: null,
  completedAt: null,
  ...overrides
})

describe('publish task routes', () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset()
    createPublishTaskMock.mockReset()
    listPublishTasksMock.mockReset()
    getPublishTaskMock.mockReset()
    updatePublishTaskMock.mockReset()
    publishPublishTaskMock.mockReset()
    schedulePublishTaskMock.mockReset()
    cancelPublishTaskMock.mockReset()

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
    publishPublishTaskMock.mockResolvedValue({
      publishTask: createPublishTask({ jobId, status: 'PUBLISHING' }),
      job: createJob()
    })
    schedulePublishTaskMock.mockResolvedValue({
      publishTask: createPublishTask({ jobId, status: 'SCHEDULED', scheduledAt }),
      job: createJob()
    })
    cancelPublishTaskMock.mockResolvedValue(createPublishTask({ status: 'CANCELED' }))
  })

  it.each([
    ['GET', '/api/v1/publish-tasks'],
    ['POST', '/api/v1/publish-tasks'],
    ['GET', `/api/v1/publish-tasks/${publishTaskId}`],
    ['PATCH', `/api/v1/publish-tasks/${publishTaskId}`],
    ['POST', `/api/v1/publish-tasks/${publishTaskId}/publish`],
    ['POST', `/api/v1/publish-tasks/${publishTaskId}/schedule`],
    ['POST', `/api/v1/publish-tasks/${publishTaskId}/cancel`]
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
    ['unsupported MVP platform', { mediaId, platform: 'TIKTOK', platformAccountId }],
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
        search: 'launch',
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
      search: 'launch',
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

  it('publishes a publish task immediately', async () => {
    const response = await request(app)
      .post(`/api/v1/publish-tasks/${publishTaskId}/publish`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      success: true,
      data: {
        publishTask: {
          ...createPublishTask({ jobId, status: 'PUBLISHING' }),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        job: {
          ...createJob(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startedAt: null,
          completedAt: null
        }
      }
    })
    expect(publishPublishTaskMock).toHaveBeenCalledWith(userId, publishTaskId)
  })

  it('schedules a publish task', async () => {
    const futureScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    schedulePublishTaskMock.mockResolvedValueOnce({
      publishTask: createPublishTask({ jobId, status: 'SCHEDULED', scheduledAt: futureScheduledAt }),
      job: createJob()
    })

    const response = await request(app)
      .post(`/api/v1/publish-tasks/${publishTaskId}/schedule`)
      .set('Authorization', 'Bearer access-token')
      .send({ scheduledAt: futureScheduledAt.toISOString() })

    expect(response.status).toBe(201)
    expect(response.body.data.publishTask).toMatchObject({
      id: publishTaskId,
      jobId,
      status: 'SCHEDULED',
      scheduledAt: futureScheduledAt.toISOString()
    })
    expect(response.body.data.job).toMatchObject({
      id: jobId,
      jobType: 'PUBLISH',
      status: 'PENDING'
    })
    expect(schedulePublishTaskMock).toHaveBeenCalledWith(userId, publishTaskId, { scheduledAt: futureScheduledAt })
  })

  it('cancels a publish task', async () => {
    const response = await request(app)
      .post(`/api/v1/publish-tasks/${publishTaskId}/cancel`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.data.publishTask).toMatchObject({
      id: publishTaskId,
      status: 'CANCELED'
    })
    expect(cancelPublishTaskMock).toHaveBeenCalledWith(userId, publishTaskId)
  })

  it('returns validation errors for invalid publish action requests', async () => {
    schedulePublishTaskMock.mockClear()

    const invalidParamResponse = await request(app)
      .post('/api/v1/publish-tasks/not-a-uuid/publish')
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(invalidParamResponse.status).toBe(400)

    const missingScheduleResponse = await request(app)
      .post(`/api/v1/publish-tasks/${publishTaskId}/schedule`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(missingScheduleResponse.status).toBe(400)

    const pastScheduleResponse = await request(app)
      .post(`/api/v1/publish-tasks/${publishTaskId}/schedule`)
      .set('Authorization', 'Bearer access-token')
      .send({ scheduledAt: new Date(Date.now() - 1000).toISOString() })

    expect(pastScheduleResponse.status).toBe(400)
    expect(schedulePublishTaskMock).not.toHaveBeenCalled()
  })
})
