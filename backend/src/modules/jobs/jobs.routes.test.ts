import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { JobsError } from './jobs.error'
import type { JobResponseData, PaginatedResult } from './jobs.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const listJobsMock = jest.fn<(userId: string, query: unknown) => Promise<PaginatedResult<JobResponseData>>>()
const getJobMock = jest.fn<(userId: string, jobId: string) => Promise<JobResponseData>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./jobs.service', () => ({
  JOB_EVENT_HEARTBEAT_INTERVAL_MS: 15000,
  JOB_EVENT_POLL_INTERVAL_MS: 2000,
  getJob: getJobMock,
  listJobs: listJobsMock,
  getJobEventName: (job: JobResponseData) => {
    if (job.status === 'COMPLETED') return 'job.completed'
    if (job.status === 'FAILED') return 'job.failed'
    return 'job.updated'
  },
  hasJobChanged: () => true,
  isTerminalJob: (job: JobResponseData) => job.status === 'COMPLETED' || job.status === 'FAILED',
  toJobEventData: (job: JobResponseData) => ({ ...job, jobId: job.id })
}))

const { app } = await import('../../app')

const jobId = '00000000-0000-4000-8000-000000000001'
const mediaId = '00000000-0000-4000-8000-000000000002'
const userId = '00000000-0000-4000-8000-000000000003'
const now = new Date('2026-05-24T10:00:00.000Z')

const user: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const createJob = (overrides: Partial<JobResponseData> = {}): JobResponseData => ({
  id: jobId,
  mediaId,
  jobType: 'TRANSCRIBE',
  status: 'TRANSCRIBING',
  progress: 55,
  errorCode: null,
  errorMessage: null,
  output: { transcriptId: '00000000-0000-4000-8000-000000000004' },
  attemptCount: 0,
  createdAt: now,
  updatedAt: now,
  startedAt: now,
  completedAt: null,
  ...overrides
})

describe('jobs routes', () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset()
    listJobsMock.mockReset()
    getJobMock.mockReset()
    getAuthenticatedUserMock.mockResolvedValue(user)
    listJobsMock.mockResolvedValue({
      items: [createJob()],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    })
    getJobMock.mockResolvedValue(createJob())
  })

  it.each([
    ['GET', '/api/v1/jobs'],
    ['GET', `/api/v1/jobs/${jobId}`],
    ['GET', `/api/v1/jobs/${jobId}/events`]
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get'](path)

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing access token'
      }
    })
  })

  it('returns validation errors for invalid job ids', async () => {
    const response = await request(app).get('/api/v1/jobs/not-a-uuid').set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      }
    })
  })

  it('lists recent jobs with pagination and filters', async () => {
    const response = await request(app)
      .get('/api/v1/jobs')
      .query({
        page: '1',
        limit: '10',
        status: 'TRANSCRIBING',
        jobType: 'TRANSCRIBE'
      })
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [
          {
            ...createJob(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            startedAt: now.toISOString(),
            completedAt: null
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
    expect(listJobsMock).toHaveBeenCalledWith(userId, {
      page: 1,
      limit: 10,
      status: 'TRANSCRIBING',
      jobType: 'TRANSCRIBE'
    })
  })

  it('returns validation errors for invalid list filters', async () => {
    const response = await request(app)
      .get('/api/v1/jobs')
      .query({ status: 'GENERATING_SUGGESTIONS' })
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

  it('returns a job snapshot', async () => {
    const response = await request(app).get(`/api/v1/jobs/${jobId}`).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        job: {
          ...createJob(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startedAt: now.toISOString(),
          completedAt: null
        }
      }
    })
    expect(getJobMock).toHaveBeenCalledWith(userId, jobId)
  })

  it('returns 404 for missing or not-owned jobs', async () => {
    getJobMock.mockRejectedValue(JobsError.notFound())

    const response = await request(app).get(`/api/v1/jobs/${jobId}`).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      }
    })
  })

  it('sends an initial completed SSE event and closes', async () => {
    getJobMock.mockResolvedValue(
      createJob({
        status: 'COMPLETED',
        progress: 100,
        completedAt: now
      })
    )

    const response = await request(app).get(`/api/v1/jobs/${jobId}/events`).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/event-stream')
    expect(response.headers['cache-control']).toBe('no-cache')
    expect(response.headers.connection).toBe('keep-alive')
    expect(response.headers['x-accel-buffering']).toBe('no')
    expect(response.text).toContain('event: job.completed')
    expect(response.text).toContain(`"jobId":"${jobId}"`)
    expect(response.text).toContain('"status":"COMPLETED"')
  })

  it('sends an initial failed SSE event and closes', async () => {
    getJobMock.mockResolvedValue(
      createJob({
        status: 'FAILED',
        errorMessage: 'Transcription failed',
        completedAt: now
      })
    )

    const response = await request(app).get(`/api/v1/jobs/${jobId}/events`).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.text).toContain('event: job.failed')
    expect(response.text).toContain('"status":"FAILED"')
    expect(response.text).toContain('"errorMessage":"Transcription failed"')
  })
})
