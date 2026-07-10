import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { MediaError } from '../media/media.error'
import { GenerateChaptersError } from './chapters.error'
import type { ChapterData, GenerateChaptersServiceResult } from './chapters.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const generateChaptersMock = jest.fn<(input: unknown) => Promise<GenerateChaptersServiceResult>>()
const listMediaChaptersMock = jest.fn<(userId: string, mediaId: string) => Promise<ChapterData[]>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./chapters.service', () => ({
  generateChapters: generateChaptersMock,
  listMediaChapters: listMediaChaptersMock
}))

const { app } = await import('../../app')

const mediaId = '00000000-0000-4000-8000-000000000001'
const jobId = '00000000-0000-4000-8000-000000000002'
const chapterId = '00000000-0000-4000-8000-000000000003'
const transcriptId = '00000000-0000-4000-8000-000000000004'
const now = new Date('2026-05-24T10:00:00.000Z')

let authenticatedUser: AuthenticatedUser
let userSequence = 0

const createUser = (sequence: number): AuthenticatedUser => ({
  id: `00000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
  email: `user-${sequence}@example.com`,
  role: 'USER',
  status: 'ACTIVE'
})

const createJobResult = (wasCreated = true): GenerateChaptersServiceResult => ({
  wasCreated,
  job: {
    id: jobId,
    mediaId,
    jobType: 'GENERATE_CHAPTERS',
    status: wasCreated ? 'PENDING' : 'QUEUED',
    progress: 0,
    errorCode: null,
    errorMessage: null,
    output: null,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null
  }
})

const createChapter = (): ChapterData => ({
  id: chapterId,
  mediaId,
  transcriptId,
  jobId,
  chapterIndex: 1,
  startTime: 0,
  endTime: 180,
  title: 'System overview',
  transcriptVersion: 2,
  version: 1,
  isEdited: false,
  source: 'SEGMENTS',
  score: 0.91,
  boundaryScore: 0.88,
  pauseScore: 0.2,
  discourseMarkerScore: 0.8,
  semanticShiftScore: 0.9,
  lexicalShiftScore: 0.45,
  valleyDepthScore: 0.51,
  boundaryQualityScore: 0.86,
  durationScore: 0.7,
  llmConfidenceScore: 0.83,
  createdAt: now,
  updatedAt: now
})

describe('chapters routes', () => {
  beforeEach(() => {
    userSequence += 1
    authenticatedUser = createUser(userSequence)
    getAuthenticatedUserMock.mockReset()
    generateChaptersMock.mockReset()
    listMediaChaptersMock.mockReset()
    getAuthenticatedUserMock.mockImplementation(async () => authenticatedUser)
    generateChaptersMock.mockResolvedValue(createJobResult())
    listMediaChaptersMock.mockResolvedValue([createChapter()])
  })

  it.each([
    ['POST', `/api/v1/media/${mediaId}/chapters/generate`],
    ['GET', `/api/v1/media/${mediaId}/chapters`]
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'post'](path).send({})

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing access token'
      }
    })
  })

  it('returns validation errors for invalid media ids', async () => {
    const response = await request(app)
      .post('/api/v1/media/not-a-uuid/chapters/generate')
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

  it('returns validation errors for invalid generate payloads', async () => {
    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/chapters/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({
        minChapterDuration: 120,
        targetChapterDuration: 60
      })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      }
    })
  })

  it('creates a chapter generation job with defaults and user options', async () => {
    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/chapters/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({
        maxChapters: 8,
        useLlm: false
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      success: true,
      data: {
        job: {
          ...createJobResult().job,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startedAt: null,
          completedAt: null
        }
      }
    })
    expect(generateChaptersMock).toHaveBeenCalledWith({
      userId: authenticatedUser.id,
      mediaId,
      minChapterDuration: 180,
      targetChapterDuration: 300,
      maxChapters: 8,
      useLlm: false,
      useEmbeddings: false
    })
  })

  it('returns an active generate chapters job with HTTP 200', async () => {
    generateChaptersMock.mockResolvedValue(createJobResult(false))

    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/chapters/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.data.job.status).toBe('QUEUED')
    expect(generateChaptersMock).toHaveBeenCalledWith({
      userId: authenticatedUser.id,
      mediaId,
      minChapterDuration: 180,
      targetChapterDuration: 300,
      maxChapters: 5,
      useLlm: true,
      useEmbeddings: false
    })
  })

  it('returns chapters for a media item', async () => {
    const response = await request(app)
      .get(`/api/v1/media/${mediaId}/chapters`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        chapters: [
          {
            ...createChapter(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          }
        ]
      }
    })
    expect(listMediaChaptersMock).toHaveBeenCalledWith(authenticatedUser.id, mediaId)
  })

  it('returns media-style errors for forbidden media access', async () => {
    listMediaChaptersMock.mockRejectedValue(MediaError.forbidden())

    const response = await request(app)
      .get(`/api/v1/media/${mediaId}/chapters`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN'
      }
    })
  })

  it('returns generate chapters errors when no transcript is available', async () => {
    generateChaptersMock.mockRejectedValue(GenerateChaptersError.noTranscript())

    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/chapters/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'GENERATE_CHAPTERS_TRANSCRIPT_NOT_FOUND'
      }
    })
  })
})
