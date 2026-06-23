import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { Media, ProcessingJob } from '../../infrastructure/db/generated/prisma/client'

const updateProcessingJobMock = jest.fn<(id: string, data: unknown) => Promise<ProcessingJob>>()
const publishMediaDerivativeJobMock = jest.fn<(message: unknown) => Promise<void>>()

jest.unstable_mockModule('./media-derivatives.repository', () => ({
  updateProcessingJob: updateProcessingJobMock
}))

jest.unstable_mockModule('./media-derivatives.queue', () => ({
  publishMediaDerivativeJob: publishMediaDerivativeJobMock
}))

const mediaDerivativesService = await import('./media-derivatives.service')

const now = new Date('2026-06-23T06:00:00.000Z')
const workspaceId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'
const mediaId = '00000000-0000-4000-8000-000000000003'

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  workspaceId,
  type: 'VIDEO',
  title: 'Demo media',
  description: null,
  originalFilename: 'demo.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: 'uploads/workspaces/demo/users/user/videos/session/original.mp4',
  s3Region: 'us-east-1',
  s3Etag: '"etag"',
  uploadId: null,
  duration: 120,
  fileSizeBytes: BigInt(1024),
  mimeType: 'video/mp4',
  width: 1920,
  height: 1080,
  metadata: null,
  status: 'UPLOADED',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createProcessingJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: 'job-default',
  mediaId,
  userId,
  projectId: null,
  jobType: 'GENERATE_THUMBNAIL',
  status: 'PENDING',
  progress: 0,
  currentStep: null,
  errorMessage: null,
  queueName: 'media_derivatives_queue',
  taskName: 'generate_thumbnail',
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

describe('media derivatives service', () => {
  beforeEach(() => {
    updateProcessingJobMock.mockReset()
    publishMediaDerivativeJobMock.mockReset()

    updateProcessingJobMock.mockImplementation(async (id, data) => createProcessingJob({ id, ...(data as object) }))
    publishMediaDerivativeJobMock.mockResolvedValue()
  })

  it('creates video derivative drafts for thumbnail, sprite, and waveform', () => {
    const drafts = mediaDerivativesService.createDerivativeJobDrafts(createMedia({ type: 'VIDEO' }))

    expect(drafts).toHaveLength(3)
    expect(drafts.map((draft) => draft.kind)).toEqual(['thumbnail', 'thumbnailSprite', 'waveformPeak'])
    expect(drafts.map((draft) => draft.data.taskName)).toEqual([
      'generate_thumbnail',
      'generate_thumbnail_sprite',
      'generate_waveform_peak'
    ])
  })

  it('creates only waveform derivative drafts for audio uploads', () => {
    const drafts = mediaDerivativesService.createDerivativeJobDrafts(
      createMedia({ type: 'AUDIO', mimeType: 'audio/mpeg' })
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      kind: 'waveformPeak',
      data: {
        taskName: 'generate_waveform_peak'
      }
    })
  })

  it('creates no derivative drafts for image uploads', () => {
    const drafts = mediaDerivativesService.createDerivativeJobDrafts(
      createMedia({ type: 'IMAGE', mimeType: 'image/png' })
    )

    expect(drafts).toEqual([])
  })

  it('marks only the failed publish job as failed', async () => {
    const media = createMedia()
    const jobs = [
      {
        kind: 'thumbnail' as const,
        job: createProcessingJob({ id: 'job-thumbnail', jobType: 'GENERATE_THUMBNAIL', taskName: 'generate_thumbnail' })
      },
      {
        kind: 'waveformPeak' as const,
        job: createProcessingJob({
          id: 'job-waveform',
          jobType: 'GENERATE_WAVEFORM_PEAK',
          taskName: 'generate_waveform_peak'
        })
      }
    ]

    publishMediaDerivativeJobMock.mockResolvedValueOnce().mockRejectedValueOnce(new Error('RabbitMQ unavailable'))

    await mediaDerivativesService.publishDerivativeJobs(media, jobs)

    expect(publishMediaDerivativeJobMock).toHaveBeenCalledTimes(2)
    expect(updateProcessingJobMock).toHaveBeenCalledTimes(1)
    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      'job-waveform',
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: expect.stringContaining('Failed to publish waveformPeak derivative job')
      })
    )
  })
})
