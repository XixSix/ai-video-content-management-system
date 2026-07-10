import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { Media, ProcessingJob, Transcript, VideoChapter } from '../../infrastructure/db/generated/prisma/client'

const findMediaByIdMock = jest.fn<(id: string) => Promise<Media | null>>()
const findLatestTranscriptByMediaIdAndUserIdMock =
  jest.fn<(mediaId: string, userId: string) => Promise<Transcript | null>>()
const findActiveGenerateChaptersJobByMediaIdAndUserIdMock =
  jest.fn<(mediaId: string, userId: string) => Promise<ProcessingJob | null>>()
const createProcessingJobMock = jest.fn<(data: unknown) => Promise<ProcessingJob>>()
const updateProcessingJobMock = jest.fn<(id: string, data: unknown) => Promise<ProcessingJob>>()
const findChaptersByMediaIdAndUserIdMock = jest.fn<(mediaId: string, userId: string) => Promise<VideoChapter[]>>()
type PublishGenerateChaptersJobMockInput = {
  jobId: string
  mediaId: string
  userId: string
  transcriptId: string
  transcriptVersion: number
}
const publishGenerateChaptersJobMock = jest.fn<(message: PublishGenerateChaptersJobMockInput) => Promise<void>>()

jest.unstable_mockModule('./chapters.repository', () => ({
  createProcessingJob: createProcessingJobMock,
  findActiveGenerateChaptersJobByMediaIdAndUserId: findActiveGenerateChaptersJobByMediaIdAndUserIdMock,
  findChaptersByMediaIdAndUserId: findChaptersByMediaIdAndUserIdMock,
  findLatestTranscriptByMediaIdAndUserId: findLatestTranscriptByMediaIdAndUserIdMock,
  findMediaById: findMediaByIdMock,
  updateProcessingJob: updateProcessingJobMock
}))

jest.unstable_mockModule('./chapters.queue', () => ({
  publishGenerateChaptersJob: publishGenerateChaptersJobMock
}))

const chaptersService = await import('./chapters.service')

const mediaId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'
const jobId = '00000000-0000-4000-8000-000000000003'
const transcriptId = '00000000-0000-4000-8000-000000000004'
const chapterId = '00000000-0000-4000-8000-000000000005'
const now = new Date('2026-05-24T10:00:00.000Z')

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  type: 'VIDEO',
  title: 'Video test',
  description: null,
  originalFilename: 'video.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: 'uploads/users/user/videos/video.mp4',
  s3Region: 'us-east-1',
  s3Etag: null,
  uploadId: null,
  duration: 120,
  fileSizeBytes: BigInt(1024),
  mimeType: 'video/mp4',
  width: 1920,
  height: 1080,
  status: 'UPLOADED',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createTranscript = (overrides: Partial<Transcript> = {}): Transcript => ({
  id: transcriptId,
  mediaId,
  jobId,
  language: 'en',
  source: 'LOCAL',
  asrModel: 'FASTER_WHISPER',
  modelSize: 'LARGE_V3',
  fullText: 'Hello. This is a transcript.',
  wordCount: 5,
  isEdited: false,
  version: 2,
  fullTextUpdatedAt: now,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createProcessingJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: jobId,
  mediaId,
  userId,
  jobType: 'GENERATE_CHAPTERS',
  status: 'PENDING',
  progress: 0,
  errorCode: null,
  errorMessage: null,
  queueName: null,
  taskName: null,
  externalTaskId: null,
  attemptCount: 0,
  input: null,
  output: null,
  createdAt: now,
  updatedAt: now,
  startedAt: null,
  completedAt: null,
  ...overrides
})

const createChapter = (overrides: Partial<VideoChapter> = {}): VideoChapter => ({
  id: chapterId,
  mediaId,
  transcriptId,
  jobId,
  chapterIndex: 1,
  startTime: 0,
  endTime: 120,
  title: 'Introduction',
  transcriptVersion: 2,
  version: 1,
  isEdited: false,
  source: 'SEGMENTS',
  score: 0.9,
  boundaryScore: 0.8,
  pauseScore: 0.2,
  discourseMarkerScore: 0.7,
  semanticShiftScore: 0.9,
  lexicalShiftScore: 0.5,
  valleyDepthScore: 0.4,
  boundaryQualityScore: 0.75,
  durationScore: 0.6,
  llmConfidenceScore: 0.85,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const generateInput = {
  mediaId,
  userId,
  minChapterDuration: 60,
  targetChapterDuration: 180,
  maxChapters: 12,
  useLlm: true,
  useEmbeddings: true
}

describe('chapters service', () => {
  beforeEach(() => {
    findMediaByIdMock.mockReset()
    findLatestTranscriptByMediaIdAndUserIdMock.mockReset()
    findActiveGenerateChaptersJobByMediaIdAndUserIdMock.mockReset()
    createProcessingJobMock.mockReset()
    updateProcessingJobMock.mockReset()
    findChaptersByMediaIdAndUserIdMock.mockReset()
    publishGenerateChaptersJobMock.mockReset()
  })

  it('selects the newest transcript, creates a pending job, and publishes it', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveGenerateChaptersJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(createTranscript())
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    publishGenerateChaptersJobMock.mockResolvedValue()

    const result = await chaptersService.generateChapters(generateInput)

    expect(findLatestTranscriptByMediaIdAndUserIdMock).toHaveBeenCalledWith(mediaId, userId)
    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        userId,
        jobType: 'GENERATE_CHAPTERS',
        status: 'PENDING',
        input: {
          transcriptId,
          transcriptVersion: 2,
          minChapterDuration: 60,
          targetChapterDuration: 180,
          maxChapters: 12,
          useLlm: true,
          useEmbeddings: true
        }
      })
    )
    expect(publishGenerateChaptersJobMock).toHaveBeenCalledWith({
      jobId,
      jobType: 'GENERATE_CHAPTERS'
    })
    expect(result).toMatchObject({
      wasCreated: true,
      job: {
        id: jobId,
        mediaId,
        jobType: 'GENERATE_CHAPTERS',
        status: 'PENDING'
      }
    })
  })

  it('returns an active generate chapters job without publishing a duplicate', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveGenerateChaptersJobByMediaIdAndUserIdMock.mockResolvedValue(createProcessingJob({ status: 'QUEUED' }))

    const result = await chaptersService.generateChapters(generateInput)

    expect(findLatestTranscriptByMediaIdAndUserIdMock).not.toHaveBeenCalled()
    expect(createProcessingJobMock).not.toHaveBeenCalled()
    expect(publishGenerateChaptersJobMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      wasCreated: false,
      job: {
        id: jobId,
        status: 'QUEUED'
      }
    })
  })

  it('allows a new job when old chapters exist but no active job exists', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveGenerateChaptersJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(createTranscript())
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    publishGenerateChaptersJobMock.mockResolvedValue()

    const result = await chaptersService.generateChapters(generateInput)

    expect(findChaptersByMediaIdAndUserIdMock).not.toHaveBeenCalled()
    expect(createProcessingJobMock).toHaveBeenCalled()
    expect(result.wasCreated).toBe(true)
  })

  it('rejects media with no transcript', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveGenerateChaptersJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(null)

    await expect(chaptersService.generateChapters(generateInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'GENERATE_CHAPTERS_TRANSCRIPT_NOT_FOUND'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('rejects non-video media', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia({ type: 'IMAGE', mimeType: 'image/png' }))

    await expect(chaptersService.generateChapters(generateInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('rejects media that is not uploaded', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia({ status: 'UPLOADING' }))

    await expect(chaptersService.generateChapters(generateInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('marks the job failed if queue publish fails', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveGenerateChaptersJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(createTranscript())
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    updateProcessingJobMock.mockResolvedValue(createProcessingJob({ status: 'FAILED' }))
    publishGenerateChaptersJobMock.mockRejectedValue(new Error('RabbitMQ unavailable'))

    await expect(chaptersService.generateChapters(generateInput)).rejects.toMatchObject({
      statusCode: 502,
      code: 'GENERATE_CHAPTERS_QUEUE_PUBLISH_FAILED'
    })
    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        progress: 0,
        errorMessage: 'Failed to publish chapter generation job',
        completedAt: expect.any(Date)
      })
    )
  })

  it('returns mapped chapters for owned media', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findChaptersByMediaIdAndUserIdMock.mockResolvedValue([createChapter()])

    const chapters = await chaptersService.listMediaChapters(userId, mediaId)

    expect(findChaptersByMediaIdAndUserIdMock).toHaveBeenCalledWith(mediaId, userId)
    expect(chapters).toEqual([
      expect.objectContaining({
        id: chapterId,
        mediaId,
        transcriptId,
        title: 'Introduction',
        semanticShiftScore: 0.9
      })
    ])
  })

  it('rejects listing chapters for non-video media', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia({ type: 'IMAGE', mimeType: 'image/png' }))

    await expect(chaptersService.listMediaChapters(userId, mediaId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
    expect(findChaptersByMediaIdAndUserIdMock).not.toHaveBeenCalled()
  })
})
