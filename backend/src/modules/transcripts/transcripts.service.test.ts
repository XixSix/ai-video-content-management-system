import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type {
  Media,
  ProcessingJob,
  Transcript,
  TranscriptSegment
} from '../../infrastructure/db/generated/prisma/client'

const findMediaByIdMock = jest.fn<(id: string) => Promise<Media | null>>()
const createProcessingJobMock = jest.fn<(data: unknown) => Promise<ProcessingJob>>()
const updateProcessingJobMock = jest.fn<(id: string, data: unknown) => Promise<ProcessingJob>>()
const findActiveTranscriptJobByMediaIdAndUserIdMock =
  jest.fn<(mediaId: string, userId: string) => Promise<ProcessingJob | null>>()
const findTranscriptsByMediaIdAndUserIdMock = jest.fn<(mediaId: string, userId: string) => Promise<Transcript[]>>()
const findTranscriptByIdAndUserIdMock = jest.fn<(transcriptId: string, userId: string) => Promise<Transcript | null>>()
const findTranscriptSegmentsByTranscriptIdAndUserIdMock =
  jest.fn<(transcriptId: string, userId: string) => Promise<TranscriptSegment[] | null>>()
const publishTranscriptJobMock =
  jest.fn<(message: { jobId: string; mediaId: string; userId: string; s3Key: string }) => Promise<void>>()
const publishTranscriptExportJobMock = jest.fn<(message: unknown) => Promise<void>>()
const publishTranscriptBurnJobMock = jest.fn<(message: unknown) => Promise<void>>()

jest.unstable_mockModule('./transcripts.repository', () => ({
  createProcessingJob: createProcessingJobMock,
  findActiveTranscriptJobByMediaIdAndUserId: findActiveTranscriptJobByMediaIdAndUserIdMock,
  findMediaById: findMediaByIdMock,
  findTranscriptByIdAndUserId: findTranscriptByIdAndUserIdMock,
  findTranscriptSegmentsByTranscriptIdAndUserId: findTranscriptSegmentsByTranscriptIdAndUserIdMock,
  findTranscriptsByMediaIdAndUserId: findTranscriptsByMediaIdAndUserIdMock,
  updateProcessingJob: updateProcessingJobMock
}))

jest.unstable_mockModule('./transcripts.queue', () => ({
  publishTranscriptBurnJob: publishTranscriptBurnJobMock,
  publishTranscriptExportJob: publishTranscriptExportJobMock,
  publishTranscriptJob: publishTranscriptJobMock
}))

const transcriptsService = await import('./transcripts.service')

const mediaId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'
const jobId = '00000000-0000-4000-8000-000000000003'
const transcriptId = '00000000-0000-4000-8000-000000000004'
const now = new Date('2026-05-24T10:00:00.000Z')
const s3Key = 'uploads/users/user/videos/video.mp4'

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  type: 'VIDEO',
  title: 'Video test',
  description: null,
  originalFilename: 'video.mp4',
  s3Bucket: 'avcms-media',
  s3Key,
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

const createProcessingJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: jobId,
  mediaId,
  userId,
  jobType: 'TRANSCRIBE',
  status: 'PENDING',
  progress: 0,
  currentStep: null,
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

const createTranscript = (overrides: Partial<Transcript> = {}): Transcript => ({
  id: transcriptId,
  mediaId,
  jobId,
  language: 'en',
  source: 'LOCAL',
  model: 'faster-whisper-large-v3',
  fullText: 'Hello. This is a transcript.',
  wordCount: 5,
  isEdited: false,
  version: 1,
  fullTextUpdatedAt: now,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createSegment = (overrides: Partial<TranscriptSegment> = {}): TranscriptSegment => ({
  id: '00000000-0000-4000-8000-000000000005',
  transcriptId,
  mediaId,
  segmentIndex: 0,
  startTime: 0,
  endTime: 4.2,
  text: 'Hello.',
  cleanText: 'Hello.',
  confidence: 0.98,
  speakerLabel: null,
  createdAt: now,
  ...overrides
})

describe('transcripts service', () => {
  beforeEach(() => {
    findMediaByIdMock.mockReset()
    createProcessingJobMock.mockReset()
    updateProcessingJobMock.mockReset()
    findActiveTranscriptJobByMediaIdAndUserIdMock.mockReset()
    findTranscriptsByMediaIdAndUserIdMock.mockReset()
    findTranscriptByIdAndUserIdMock.mockReset()
    findTranscriptSegmentsByTranscriptIdAndUserIdMock.mockReset()
    publishTranscriptJobMock.mockReset()
    publishTranscriptExportJobMock.mockReset()
    publishTranscriptBurnJobMock.mockReset()
  })

  it('creates a pending transcribe job and publishes it', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveTranscriptJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    publishTranscriptJobMock.mockResolvedValue()

    const result = await transcriptsService.generateTranscript({
      mediaId,
      userId,
      language: 'en',
      useVad: true,
      sourceSeparation: true,
      useDiarization: true
    })

    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        userId,
        jobType: 'TRANSCRIBE',
        status: 'PENDING',
        input: {
          language: 'en',
          useVad: true,
          sourceSeparation: true,
          useDiarization: true
        }
      })
    )
    expect(publishTranscriptJobMock).toHaveBeenCalledWith({ jobId, mediaId, userId, s3Key })
    expect(updateProcessingJobMock).not.toHaveBeenCalled()
    expect(result.job).toMatchObject({
      id: jobId,
      mediaId,
      jobType: 'TRANSCRIBE',
      status: 'PENDING'
    })
  })

  it('returns an active transcribe job without publishing a duplicate', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveTranscriptJobByMediaIdAndUserIdMock.mockResolvedValue(
      createProcessingJob({
        status: 'QUEUED',
        queueName: 'transcript_queue',
        taskName: 'transcribe',
        currentStep: 'Queued for transcription'
      })
    )

    const result = await transcriptsService.generateTranscript({
      mediaId,
      userId,
      language: 'en',
      useVad: true,
      sourceSeparation: true,
      useDiarization: true
    })

    expect(findActiveTranscriptJobByMediaIdAndUserIdMock).toHaveBeenCalledWith(mediaId, userId)
    expect(createProcessingJobMock).not.toHaveBeenCalled()
    expect(publishTranscriptJobMock).not.toHaveBeenCalled()
    expect(result.job).toMatchObject({
      id: jobId,
      mediaId,
      jobType: 'TRANSCRIBE',
      status: 'QUEUED'
    })
  })

  it('rejects non-video media', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia({ type: 'IMAGE', mimeType: 'image/png' }))

    await expect(
      transcriptsService.generateTranscript({
        mediaId,
        userId,
        language: 'auto',
        useVad: true,
        sourceSeparation: false,
        useDiarization: false
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('rejects media that is not uploaded', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia({ status: 'UPLOADING' }))

    await expect(
      transcriptsService.generateTranscript({
        mediaId,
        userId,
        language: 'auto',
        useVad: true,
        sourceSeparation: false,
        useDiarization: false
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('marks the job failed when publishing fails', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveTranscriptJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    updateProcessingJobMock.mockResolvedValue(createProcessingJob({ status: 'FAILED' }))
    publishTranscriptJobMock.mockRejectedValue(new Error('RabbitMQ is unavailable'))

    await expect(
      transcriptsService.generateTranscript({
        mediaId,
        userId,
        language: 'auto',
        useVad: true,
        sourceSeparation: false,
        useDiarization: false
      })
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'QUEUE_PUBLISH_FAILED'
    })

    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'Failed to publish transcript generation job'
      })
    )
  })

  it('creates a pending transcript export job and publishes it', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(createTranscript({ version: 3 }))
    createProcessingJobMock.mockResolvedValue(createProcessingJob({ jobType: 'GENERATE_SUBTITLE' }))
    publishTranscriptExportJobMock.mockResolvedValue()

    const result = await transcriptsService.exportTranscript({
      transcriptId,
      userId,
      format: 'vtt'
    })

    expect(findTranscriptByIdAndUserIdMock).toHaveBeenCalledWith(transcriptId, userId)
    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        userId,
        jobType: 'GENERATE_SUBTITLE',
        status: 'PENDING',
        input: {
          transcriptId,
          transcriptVersion: 3,
          format: 'vtt'
        }
      })
    )
    expect(publishTranscriptExportJobMock).toHaveBeenCalledWith({
      jobId,
      mediaId,
      userId,
      transcriptId,
      transcriptVersion: 3,
      format: 'vtt'
    })
    expect(result.job).toMatchObject({
      id: jobId,
      mediaId,
      jobType: 'GENERATE_SUBTITLE',
      status: 'PENDING'
    })
  })

  it('creates a pending transcript burn job and publishes it', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(createTranscript({ version: 4 }))
    createProcessingJobMock.mockResolvedValue(createProcessingJob({ jobType: 'BURN_SUBTITLE' }))
    publishTranscriptBurnJobMock.mockResolvedValue()

    const result = await transcriptsService.burnTranscript({
      transcriptId,
      userId
    })

    expect(findTranscriptByIdAndUserIdMock).toHaveBeenCalledWith(transcriptId, userId)
    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        userId,
        jobType: 'BURN_SUBTITLE',
        status: 'PENDING',
        input: {
          transcriptId,
          transcriptVersion: 4
        }
      })
    )
    expect(publishTranscriptBurnJobMock).toHaveBeenCalledWith({
      jobId,
      mediaId,
      userId,
      transcriptId,
      transcriptVersion: 4
    })
    expect(result.job).toMatchObject({
      id: jobId,
      mediaId,
      jobType: 'BURN_SUBTITLE',
      status: 'PENDING'
    })
  })

  it('throws TRANSCRIPT_NOT_FOUND when exporting a missing transcript', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(null)

    await expect(
      transcriptsService.exportTranscript({
        transcriptId,
        userId,
        format: 'json'
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TRANSCRIPT_NOT_FOUND'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('throws TRANSCRIPT_NOT_FOUND when burning a missing transcript', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(null)

    await expect(
      transcriptsService.burnTranscript({
        transcriptId,
        userId
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TRANSCRIPT_NOT_FOUND'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('marks the export job failed when publishing fails', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(createTranscript())
    createProcessingJobMock.mockResolvedValue(createProcessingJob({ jobType: 'GENERATE_SUBTITLE' }))
    updateProcessingJobMock.mockResolvedValue(createProcessingJob({ status: 'FAILED' }))
    publishTranscriptExportJobMock.mockRejectedValue(new Error('RabbitMQ is unavailable'))

    await expect(
      transcriptsService.exportTranscript({
        transcriptId,
        userId,
        format: 'srt'
      })
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'QUEUE_PUBLISH_FAILED'
    })

    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'Failed to publish transcript export job'
      })
    )
  })

  it('marks the burn job failed when publishing fails', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(createTranscript())
    createProcessingJobMock.mockResolvedValue(createProcessingJob({ jobType: 'BURN_SUBTITLE' }))
    updateProcessingJobMock.mockResolvedValue(createProcessingJob({ status: 'FAILED' }))
    publishTranscriptBurnJobMock.mockRejectedValue(new Error('RabbitMQ is unavailable'))

    await expect(
      transcriptsService.burnTranscript({
        transcriptId,
        userId
      })
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'QUEUE_PUBLISH_FAILED'
    })

    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'Failed to publish transcript burn job'
      })
    )
  })

  it('lists transcript summaries for an owned media item', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findTranscriptsByMediaIdAndUserIdMock.mockResolvedValue([createTranscript()])

    const transcripts = await transcriptsService.listMediaTranscripts(userId, mediaId)

    expect(transcripts).toEqual([
      expect.objectContaining({
        id: transcriptId,
        fullTextPreview: 'Hello. This is a transcript.',
        version: 1
      })
    ])
  })

  it('returns transcript detail for an owned transcript', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(createTranscript())

    const transcript = await transcriptsService.getTranscript(userId, transcriptId)

    expect(transcript).toMatchObject({
      id: transcriptId,
      fullText: 'Hello. This is a transcript.',
      wordCount: 5
    })
  })

  it('returns ordered segments for an owned transcript', async () => {
    findTranscriptSegmentsByTranscriptIdAndUserIdMock.mockResolvedValue([createSegment()])

    const segments = await transcriptsService.listTranscriptSegments(userId, transcriptId)

    expect(segments).toEqual([
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000005',
        segmentIndex: 0,
        text: 'Hello.'
      })
    ])
  })

  it('throws TRANSCRIPT_NOT_FOUND when transcript is missing or not owned', async () => {
    findTranscriptByIdAndUserIdMock.mockResolvedValue(null)

    await expect(transcriptsService.getTranscript(userId, transcriptId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'TRANSCRIPT_NOT_FOUND'
    })
  })
})
