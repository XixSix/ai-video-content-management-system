import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { MediaError } from '../media/media.error'
import { TranscriptError } from './transcripts.error'
import type {
  GenerateTranscriptResult,
  TranscriptDetailData,
  TranscriptSegmentData,
  TranscriptSummaryData
} from './transcripts.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const generateTranscriptMock = jest.fn<(input: unknown) => Promise<GenerateTranscriptResult>>()
const exportTranscriptMock = jest.fn<(input: unknown) => Promise<GenerateTranscriptResult>>()
const burnTranscriptMock = jest.fn<(input: unknown) => Promise<GenerateTranscriptResult>>()
const listMediaTranscriptsMock = jest.fn<(userId: string, mediaId: string) => Promise<TranscriptSummaryData[]>>()
const getTranscriptMock = jest.fn<(userId: string, transcriptId: string) => Promise<TranscriptDetailData>>()
const listTranscriptSegmentsMock = jest.fn<(userId: string, transcriptId: string) => Promise<TranscriptSegmentData[]>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./transcripts.service', () => ({
  burnTranscript: burnTranscriptMock,
  exportTranscript: exportTranscriptMock,
  generateTranscript: generateTranscriptMock,
  getTranscript: getTranscriptMock,
  listMediaTranscripts: listMediaTranscriptsMock,
  listTranscriptSegments: listTranscriptSegmentsMock
}))

const { app } = await import('../../app')

const mediaId = '00000000-0000-4000-8000-000000000001'
const transcriptId = '00000000-0000-4000-8000-000000000002'
const jobId = '00000000-0000-4000-8000-000000000003'
const now = new Date('2026-05-24T10:00:00.000Z')

let authenticatedUser: AuthenticatedUser
let userSequence = 0

const createUser = (sequence: number): AuthenticatedUser => ({
  id: `00000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
  email: `user-${sequence}@example.com`,
  role: 'USER',
  status: 'ACTIVE'
})

const createJobResult = (): GenerateTranscriptResult => ({
  job: {
    id: jobId,
    mediaId,
    jobType: 'TRANSCRIBE',
    status: 'QUEUED',
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

const createExportJobResult = (): GenerateTranscriptResult => ({
  job: {
    ...createJobResult().job,
    jobType: 'GENERATE_SUBTITLE'
  }
})

const createBurnJobResult = (): GenerateTranscriptResult => ({
  job: {
    ...createJobResult().job,
    jobType: 'BURN_SUBTITLE'
  }
})

const createTranscriptSummary = (): TranscriptSummaryData => ({
  id: transcriptId,
  mediaId,
  jobId,
  language: 'en',
  source: 'LOCAL',
  asrModel: 'FASTER_WHISPER',
  modelSize: 'LARGE_V3',
  fullTextPreview: 'Hello.',
  wordCount: 2,
  isEdited: false,
  version: 1,
  fullTextUpdatedAt: now,
  createdAt: now,
  updatedAt: now
})

const createTranscriptDetail = (): TranscriptDetailData => ({
  ...createTranscriptSummary(),
  fullText: 'Hello.'
})

const createSegment = (): TranscriptSegmentData => ({
  id: '00000000-0000-4000-8000-000000000004',
  transcriptId,
  mediaId,
  segmentIndex: 0,
  startTime: 0,
  endTime: 2.4,
  text: 'Hello.',
  cleanText: 'Hello.',
  confidence: 0.98,
  speakerLabel: null,
  createdAt: now
})

describe('transcript routes', () => {
  beforeEach(() => {
    userSequence += 1
    authenticatedUser = createUser(userSequence)
    getAuthenticatedUserMock.mockReset()
    generateTranscriptMock.mockReset()
    exportTranscriptMock.mockReset()
    burnTranscriptMock.mockReset()
    listMediaTranscriptsMock.mockReset()
    getTranscriptMock.mockReset()
    listTranscriptSegmentsMock.mockReset()
    getAuthenticatedUserMock.mockImplementation(async () => authenticatedUser)
    generateTranscriptMock.mockResolvedValue(createJobResult())
    exportTranscriptMock.mockResolvedValue(createExportJobResult())
    burnTranscriptMock.mockResolvedValue(createBurnJobResult())
    listMediaTranscriptsMock.mockResolvedValue([createTranscriptSummary()])
    getTranscriptMock.mockResolvedValue(createTranscriptDetail())
    listTranscriptSegmentsMock.mockResolvedValue([createSegment()])
  })

  it.each([
    ['POST', `/api/v1/media/${mediaId}/transcripts/generate`],
    ['GET', `/api/v1/media/${mediaId}/transcripts`],
    ['GET', `/api/v1/transcripts/${transcriptId}`],
    ['GET', `/api/v1/transcripts/${transcriptId}/segments`],
    ['POST', `/api/v1/transcripts/${transcriptId}/export`],
    ['POST', `/api/v1/transcripts/${transcriptId}/burn`]
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
      .post('/api/v1/media/not-a-uuid/transcripts/generate')
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
      .post(`/api/v1/media/${mediaId}/transcripts/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({
        language: 'en',
        sourceSeparation: 'yes'
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

  it('rate limits transcript generation by authenticated user', async () => {
    authenticatedUser = createUser(999)

    await request(app)
      .post(`/api/v1/media/${mediaId}/transcripts/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({})
    await request(app)
      .post(`/api/v1/media/${mediaId}/transcripts/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/transcripts/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(429)
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many transcript generation requests'
      }
    })
  })

  it('creates a transcript generation job', async () => {
    const response = await request(app)
      .post(`/api/v1/media/${mediaId}/transcripts/generate`)
      .set('Authorization', 'Bearer access-token')
      .send({
        language: 'en',
        sourceSeparation: true,
        useDiarization: true
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
    expect(generateTranscriptMock).toHaveBeenCalledWith({
      userId: authenticatedUser.id,
      mediaId,
      language: 'en',
      useVad: true,
      sourceSeparation: true,
      useDiarization: true
    })
  })

  it('returns validation errors for invalid export payloads', async () => {
    const response = await request(app)
      .post(`/api/v1/transcripts/${transcriptId}/export`)
      .set('Authorization', 'Bearer access-token')
      .send({
        format: 'pdf'
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

  it('returns validation errors for invalid transcript ids on export', async () => {
    const response = await request(app)
      .post('/api/v1/transcripts/not-a-uuid/export')
      .set('Authorization', 'Bearer access-token')
      .send({
        format: 'srt'
      })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR'
      }
    })
  })

  it('creates a transcript export job', async () => {
    const response = await request(app)
      .post(`/api/v1/transcripts/${transcriptId}/export`)
      .set('Authorization', 'Bearer access-token')
      .send({
        format: 'srt'
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      success: true,
      data: {
        job: {
          ...createExportJobResult().job,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startedAt: null,
          completedAt: null
        }
      }
    })
    expect(exportTranscriptMock).toHaveBeenCalledWith({
      userId: authenticatedUser.id,
      transcriptId,
      format: 'srt'
    })
  })

  it('creates a transcript burn job', async () => {
    const response = await request(app)
      .post(`/api/v1/transcripts/${transcriptId}/burn`)
      .set('Authorization', 'Bearer access-token')
      .send({})

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      success: true,
      data: {
        job: {
          ...createBurnJobResult().job,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startedAt: null,
          completedAt: null
        }
      }
    })
    expect(burnTranscriptMock).toHaveBeenCalledWith({
      userId: authenticatedUser.id,
      transcriptId
    })
  })

  it('returns transcript summaries for a media item', async () => {
    const response = await request(app)
      .get(`/api/v1/media/${mediaId}/transcripts`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        transcripts: [
          {
            ...createTranscriptSummary(),
            fullTextUpdatedAt: now.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          }
        ]
      }
    })
    expect(listMediaTranscriptsMock).toHaveBeenCalledWith(authenticatedUser.id, mediaId)
  })

  it('returns transcript detail', async () => {
    const response = await request(app)
      .get(`/api/v1/transcripts/${transcriptId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body.data.transcript).toMatchObject({
      id: transcriptId,
      fullText: 'Hello.',
      fullTextUpdatedAt: now.toISOString()
    })
    expect(getTranscriptMock).toHaveBeenCalledWith(authenticatedUser.id, transcriptId)
  })

  it('returns transcript segments', async () => {
    const response = await request(app)
      .get(`/api/v1/transcripts/${transcriptId}/segments`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        segments: [
          {
            ...createSegment(),
            createdAt: now.toISOString()
          }
        ]
      }
    })
    expect(listTranscriptSegmentsMock).toHaveBeenCalledWith(authenticatedUser.id, transcriptId)
  })

  it('returns media-style errors for forbidden media access', async () => {
    listMediaTranscriptsMock.mockRejectedValue(MediaError.forbidden())

    const response = await request(app)
      .get(`/api/v1/media/${mediaId}/transcripts`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN'
      }
    })
  })

  it('returns transcript not found errors for missing transcripts', async () => {
    getTranscriptMock.mockRejectedValue(TranscriptError.notFound())

    const response = await request(app)
      .get(`/api/v1/transcripts/${transcriptId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'TRANSCRIPT_NOT_FOUND'
      }
    })
  })
})
