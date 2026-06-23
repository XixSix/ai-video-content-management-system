import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { EditorSnapshot, Media, ProcessingJob, Project } from '../../infrastructure/db/generated/prisma/client'

const findProjectForRenderExportMock = jest.fn()
const findActiveRenderExportJobMock = jest.fn()
const createProcessingJobMock = jest.fn()
const updateProcessingJobMock = jest.fn()
const isDeletedProjectMock = jest.fn()
const publishRenderExportJobMock = jest.fn<(message: unknown) => Promise<void>>()

jest.unstable_mockModule('./render-exports.repository', () => ({
  findProjectForRenderExport: findProjectForRenderExportMock,
  findActiveRenderExportJob: findActiveRenderExportJobMock,
  createProcessingJob: createProcessingJobMock,
  updateProcessingJob: updateProcessingJobMock,
  isDeletedProject: isDeletedProjectMock
}))

jest.unstable_mockModule('./render-exports.queue', () => ({
  publishRenderExportJob: publishRenderExportJobMock
}))

const renderExportsService = await import('./render-exports.service')

const now = new Date('2026-06-24T00:00:00.000Z')
const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'
const workspaceId = '00000000-0000-4000-8000-000000000003'
const projectId = '00000000-0000-4000-8000-000000000004'
const mediaId = '00000000-0000-4000-8000-000000000005'
const snapshotId = '00000000-0000-4000-8000-000000000006'
const jobId = '00000000-0000-4000-8000-000000000007'

const media = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  workspaceId,
  type: 'VIDEO',
  title: 'Source',
  description: null,
  originalFilename: 'source.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: 'uploads/source.mp4',
  s3Region: 'us-east-1',
  s3Etag: null,
  uploadId: null,
  duration: 30,
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

const snapshot = (overrides: Partial<EditorSnapshot> = {}): EditorSnapshot => ({
  id: snapshotId,
  projectId,
  version: 3,
  snapshot: {
    schemaVersion: 1,
    settings: { aspectRatio: '16:9' },
    layers: [],
    timelineTracks: []
  },
  savedByUserId: userId,
  savedAt: now,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const project = (
  overrides: Partial<Project> & {
    sourceMedia?: Media | null
    editorSnapshot?: EditorSnapshot | null
  } = {}
) => ({
  id: projectId,
  userId,
  workspaceId,
  sourceMediaId: mediaId,
  thumbnailMediaId: null,
  title: 'Project',
  slug: 'project',
  status: 'DRAFT',
  aspectRatio: '16:9',
  duration: 30,
  createdAt: now,
  updatedAt: now,
  sourceMedia: media(),
  editorSnapshot: snapshot(),
  ...overrides
})

const processingJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: jobId,
  mediaId,
  userId,
  projectId,
  jobType: 'EXPORT_RENDER',
  status: 'PENDING',
  progress: 0,
  currentStep: null,
  errorMessage: null,
  queueName: 'render_exports_queue',
  taskName: 'export_render',
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

describe('render exports service', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    findProjectForRenderExportMock.mockResolvedValue(project())
    findActiveRenderExportJobMock.mockResolvedValue(null)
    createProcessingJobMock.mockResolvedValue(processingJob())
    updateProcessingJobMock.mockResolvedValue(processingJob({ status: 'FAILED' }))
    isDeletedProjectMock.mockReturnValue(false)
    publishRenderExportJobMock.mockResolvedValue()
  })

  it('creates an EXPORT_RENDER processing job from the latest editor snapshot', async () => {
    const result = await renderExportsService.createRenderExport(userId, workspaceId, projectId)

    expect(result.wasCreated).toBe(true)
    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        userId,
        projectId,
        jobType: 'EXPORT_RENDER',
        queueName: 'render_exports_queue',
        taskName: 'export_render',
        input: expect.objectContaining({
          editorSnapshotId: snapshotId,
          editorSnapshotVersion: 3
        })
      })
    )
    expect(publishRenderExportJobMock).toHaveBeenCalledWith({
      jobId,
      mediaId,
      projectId,
      workspaceId,
      userId
    })
    expect(result.job.id).toBe(jobId)
  })

  it('returns an active render job instead of creating a duplicate', async () => {
    findActiveRenderExportJobMock.mockResolvedValue(processingJob({ id: 'active-job' }))

    const result = await renderExportsService.createRenderExport(userId, workspaceId, projectId)

    expect(result.wasCreated).toBe(false)
    expect(result.job.id).toBe('active-job')
    expect(createProcessingJobMock).not.toHaveBeenCalled()
    expect(publishRenderExportJobMock).not.toHaveBeenCalled()
  })

  it('requires project creator ownership, source video, and editor snapshot', async () => {
    findProjectForRenderExportMock.mockResolvedValueOnce(project({ userId: otherUserId }))
    await expect(renderExportsService.createRenderExport(userId, workspaceId, projectId)).rejects.toMatchObject({
      code: 'FORBIDDEN'
    })

    findProjectForRenderExportMock.mockResolvedValueOnce(project({ sourceMedia: null, sourceMediaId: null }))
    await expect(renderExportsService.createRenderExport(userId, workspaceId, projectId)).rejects.toMatchObject({
      code: 'PROJECT_SOURCE_MEDIA_REQUIRED'
    })

    findProjectForRenderExportMock.mockResolvedValueOnce(project({ sourceMedia: media({ type: 'AUDIO' }) }))
    await expect(renderExportsService.createRenderExport(userId, workspaceId, projectId)).rejects.toMatchObject({
      code: 'PROJECT_SOURCE_MEDIA_INVALID'
    })

    findProjectForRenderExportMock.mockResolvedValueOnce(project({ editorSnapshot: null }))
    await expect(renderExportsService.createRenderExport(userId, workspaceId, projectId)).rejects.toMatchObject({
      code: 'PROJECT_EDITOR_SNAPSHOT_REQUIRED'
    })
  })

  it('marks the job failed when queue publishing fails', async () => {
    publishRenderExportJobMock.mockRejectedValue(new Error('RabbitMQ unavailable'))

    await expect(renderExportsService.createRenderExport(userId, workspaceId, projectId)).rejects.toMatchObject({
      code: 'RENDER_EXPORT_QUEUE_PUBLISH_FAILED'
    })

    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'Failed to publish render export job'
      })
    )
  })
})
