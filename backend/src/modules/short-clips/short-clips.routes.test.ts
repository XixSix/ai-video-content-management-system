import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { MediaError } from '../media/media.error'
import { ShortClipsError } from './short-clips.error'
import type {
  ClipCandidateData,
  CreateShortClipDownloadUrlResult,
  GenerateShortClipsServiceResult,
  PaginatedResult,
  ShortClipData
} from './short-clips.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const generateShortClipsMock = jest.fn<(input: unknown) => Promise<GenerateShortClipsServiceResult>>()
const listClipCandidatesMock =
  jest.fn<(userId: string, mediaId: string, query: unknown) => Promise<PaginatedResult<ClipCandidateData>>>()
const getClipCandidateMock = jest.fn<(userId: string, candidateId: string) => Promise<ClipCandidateData>>()
const listShortClipsMock =
  jest.fn<(userId: string, mediaId: string, query: unknown) => Promise<PaginatedResult<ShortClipData>>>()
const getShortClipMock = jest.fn<(userId: string, shortClipId: string) => Promise<ShortClipData>>()
const createShortClipDownloadUrlMock =
  jest.fn<(userId: string, shortClipId: string) => Promise<CreateShortClipDownloadUrlResult>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./short-clips.service', () => ({
  createShortClipDownloadUrl: createShortClipDownloadUrlMock,
  generateShortClips: generateShortClipsMock,
  getClipCandidate: getClipCandidateMock,
  getShortClip: getShortClipMock,
  listClipCandidates: listClipCandidatesMock,
  listShortClips: listShortClipsMock
}))

const { app } = await import('../../app')

const mediaId = '00000000-0000-4000-8000-000000000001'
const jobId = '00000000-0000-4000-8000-000000000002'
const candidateId = '00000000-0000-4000-8000-000000000003'
const transcriptId = '00000000-0000-4000-8000-000000000004'
const chapterId = '00000000-0000-4000-8000-000000000005'
const shortClipId = '00000000-0000-4000-8000-000000000006'
const now = new Date('2026-05-24T10:00:00.000Z')

let authenticatedUser: AuthenticatedUser
let userSequence = 0

const createUser = (sequence: number): AuthenticatedUser => ({
  id: `00000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
  email: `user-${sequence}@example.com`,
  role: 'USER',
  status: 'ACTIVE'
})

const createJobResult = (wasCreated = true): GenerateShortClipsServiceResult => ({
  wasCreated,
  job: {
    id: jobId,
    mediaId,
    jobType: 'GENERATE_SHORT_CLIPS',
    status: wasCreated ? 'PENDING' : 'QUEUED',
    progress: 0,
    errorMessage: null,
    output: null,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null
  }
})

const createCandidate = (): ClipCandidateData => ({
  id: candidateId,
  mediaId,
  transcriptId,
  chapterId,
  jobId,
  startTime: 12.5,
  endTime: 52.5,
  duration: 40,
  transcriptVersion: 2,
  text: 'This clip has a strong hook.',
  cleanText: 'this clip has a strong hook',
  hookScore: 0.9,
  questionScore: 0.2,
  keywordScore: 0.7,
  durationScore: 0.8,
  speechDensityScore: 0.6,
  saliencyScore: 0.85,
  completenessScore: 0.75,
  emotionScore: null,
  finalScore: 0.82,
  llmScore: 0.88,
  llmReason: 'Strong standalone segment.',
  dedupGroupId: 'dedup-1',
  metadata: { sourceSegmentIds: ['segment-1'] },
  status: 'CANDIDATE',
  createdAt: now
})

const createShortClip = (): ShortClipData => ({
  id: shortClipId,
  mediaId,
  userId: authenticatedUser.id,
  transcriptId,
  chapterId,
  candidateId,
  title: 'Strong short clip',
  caption: 'A strong short clip caption.',
  description: null,
  hashtags: ['#shorts'],
  startTime: 12.5,
  endTime: 52.5,
  duration: 40,
  transcriptVersion: 2,
  score: 0.82,
  reason: 'Strong hook and complete context.',
  videoPath: 'clips/media/clip.mp4',
  thumbnailPath: null,
  subtitlePath: null,
  aspectRatio: '9:16',
  status: 'READY',
  createdAt: now,
  updatedAt: now
})

describe('short clip routes', () => {
  beforeEach(() => {
    userSequence += 1
    authenticatedUser = createUser(userSequence)
    getAuthenticatedUserMock.mockReset()
    generateShortClipsMock.mockReset()
    listClipCandidatesMock.mockReset()
    getClipCandidateMock.mockReset()
    listShortClipsMock.mockReset()
    getShortClipMock.mockReset()
    createShortClipDownloadUrlMock.mockReset()
    getAuthenticatedUserMock.mockImplementation(async () => authenticatedUser)
    generateShortClipsMock.mockResolvedValue(createJobResult())
    listClipCandidatesMock.mockResolvedValue({
      items: [createCandidate()],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    })
    getClipCandidateMock.mockResolvedValue(createCandidate())
    listShortClipsMock.mockImplementation(async () => ({
      items: [createShortClip()],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    }))
    getShortClipMock.mockImplementation(async () => createShortClip())
    createShortClipDownloadUrlMock.mockResolvedValue({
      url: 'http://localhost:9000/vidpilot-media/clips/media/clip.mp4?signature=test',
      expiresInSeconds: 900
    })
  })

  it.each([
    ['POST', `/api/v1/media/${mediaId}/short-clips/generate`],
    ['GET', `/api/v1/media/${mediaId}/clip-candidates`],
    ['GET', `/api/v1/clip-candidates/${candidateId}`],
    ['GET', `/api/v1/media/${mediaId}/short-clips`],
    ['GET', `/api/v1/short-clips/${shortClipId}`],
    ['GET', `/api/v1/short-clips/${shortClipId}/download-url`]
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

  it('returns validation errors for invalid ids', async () => {
    const response = await request(app)
      .post('/api/v1/media/not-a-uuid/short-clips/generate')
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR'
      }
    })
  })

  it('creates a short clip generation job with an empty body', async () => {
    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/short-clips/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({})

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
    expect(generateShortClipsMock).toHaveBeenCalledWith({
      userId: authenticatedUser.id,
      mediaId
    })
  })

  it('returns an active short clip job with HTTP 200', async () => {
    generateShortClipsMock.mockResolvedValue(createJobResult(false))

    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/short-clips/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.data.job.status).toBe('QUEUED')
  })

  it('lists clip candidates with paged filters', async () => {
    const response = await request(app)
      .get(`/api/v1/media/${mediaId}/clip-candidates`)
      .query({
        page: 2,
        limit: 5,
        status: 'CANDIDATE',
        transcriptId,
        chapterId,
        jobId,
        sortBy: 'createdAt',
        sortOrder: 'asc'
      })
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [
          {
            ...createCandidate(),
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
    expect(listClipCandidatesMock).toHaveBeenCalledWith(authenticatedUser.id, mediaId, {
      page: 2,
      limit: 5,
      status: 'CANDIDATE',
      transcriptId,
      chapterId,
      jobId,
      sortBy: 'createdAt',
      sortOrder: 'asc'
    })
  })

  it('returns a clip candidate detail', async () => {
    const response = await request(app)
      .get(`/api/v1/clip-candidates/${candidateId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        candidate: {
          ...createCandidate(),
          createdAt: now.toISOString()
        }
      }
    })
    expect(getClipCandidateMock).toHaveBeenCalledWith(authenticatedUser.id, candidateId)
  })

  it('lists short clips with paged filters', async () => {
    const response = await request(app)
      .get(`/api/v1/media/${mediaId}/short-clips`)
      .query({
        page: 2,
        limit: 5,
        status: 'READY',
        sortBy: 'score',
        sortOrder: 'asc'
      })
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [
          {
            ...createShortClip(),
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
    expect(listShortClipsMock).toHaveBeenCalledWith(authenticatedUser.id, mediaId, {
      page: 2,
      limit: 5,
      status: 'READY',
      sortBy: 'score',
      sortOrder: 'asc'
    })
  })

  it('returns a short clip detail', async () => {
    const response = await request(app)
      .get(`/api/v1/short-clips/${shortClipId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        shortClip: {
          ...createShortClip(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      }
    })
    expect(getShortClipMock).toHaveBeenCalledWith(authenticatedUser.id, shortClipId)
  })

  it('returns a short clip download URL', async () => {
    const response = await request(app)
      .get(`/api/v1/short-clips/${shortClipId}/download-url`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        url: 'http://localhost:9000/vidpilot-media/clips/media/clip.mp4?signature=test',
        expiresInSeconds: 900
      }
    })
    expect(createShortClipDownloadUrlMock).toHaveBeenCalledWith(authenticatedUser.id, shortClipId)
  })

  it('propagates media errors from candidate listing', async () => {
    listClipCandidatesMock.mockRejectedValue(MediaError.forbidden())

    const response = await request(app)
      .get(`/api/v1/media/${mediaId}/clip-candidates`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN'
      }
    })
  })

  it('propagates candidate not found errors', async () => {
    getClipCandidateMock.mockRejectedValue(ShortClipsError.candidateNotFound())

    const response = await request(app)
      .get(`/api/v1/clip-candidates/${candidateId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CLIP_CANDIDATE_NOT_FOUND'
      }
    })
  })

  it('propagates short clip not found errors', async () => {
    getShortClipMock.mockRejectedValue(ShortClipsError.shortClipNotFound())

    const response = await request(app)
      .get(`/api/v1/short-clips/${shortClipId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'SHORT_CLIP_NOT_FOUND'
      }
    })
  })
})
