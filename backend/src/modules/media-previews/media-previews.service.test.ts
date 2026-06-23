import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { Media, ProcessingJob } from '../../infrastructure/db/generated/prisma/client'

const updateProcessingJobMock = jest.fn<(id: string, data: unknown) => Promise<ProcessingJob>>()
const publishMediaPreviewJobMock = jest.fn<(message: unknown) => Promise<void>>()

jest.unstable_mockModule('./media-previews.repository', () => ({
  updateProcessingJob: updateProcessingJobMock
}))

jest.unstable_mockModule('./media-previews.queue', () => ({
  publishMediaPreviewJob: publishMediaPreviewJobMock
}))

const mediaPreviewsService = await import('./media-previews.service')

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
  queueName: 'media_previews_queue',
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

describe('media previews service', () => {
  beforeEach(() => {
    updateProcessingJobMock.mockReset()
    publishMediaPreviewJobMock.mockReset()

    updateProcessingJobMock.mockImplementation(async (id, data) => createProcessingJob({ id, ...(data as object) }))
    publishMediaPreviewJobMock.mockResolvedValue()
  })

  it('creates video preview drafts for thumbnail, sprite, and waveform', () => {
    const drafts = mediaPreviewsService.createPreviewJobDrafts(createMedia({ type: 'VIDEO' }))

    expect(drafts).toHaveLength(3)
    expect(drafts.map((draft) => draft.kind)).toEqual(['thumbnail', 'thumbnailSprite', 'waveformPeak'])
    expect(drafts.map((draft) => draft.data.taskName)).toEqual([
      'generate_thumbnail',
      'generate_thumbnail_sprite',
      'generate_waveform_peak'
    ])
  })

  it('creates only waveform preview drafts for audio uploads', () => {
    const drafts = mediaPreviewsService.createPreviewJobDrafts(createMedia({ type: 'AUDIO', mimeType: 'audio/mpeg' }))

    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      kind: 'waveformPeak',
      data: {
        taskName: 'generate_waveform_peak'
      }
    })
  })

  it('creates no preview drafts for image uploads', () => {
    const drafts = mediaPreviewsService.createPreviewJobDrafts(createMedia({ type: 'IMAGE', mimeType: 'image/png' }))

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

    publishMediaPreviewJobMock.mockResolvedValueOnce().mockRejectedValueOnce(new Error('RabbitMQ unavailable'))

    await mediaPreviewsService.publishPreviewJobs(media, jobs)

    expect(publishMediaPreviewJobMock).toHaveBeenCalledTimes(2)
    expect(updateProcessingJobMock).toHaveBeenCalledTimes(1)
    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      'job-waveform',
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: expect.stringContaining('Failed to publish waveformPeak preview job')
      })
    )
  })
})
