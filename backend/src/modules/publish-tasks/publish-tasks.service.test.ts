import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  Prisma,
  type Media,
  type PlatformAccount,
  type ProcessingJob,
  type PublishTask,
  type ShortClip
} from '../../infrastructure/db/generated/prisma/client'

const createPublishTaskMock = jest.fn<(data: unknown) => Promise<PublishTask>>()
const createProcessingJobMock = jest.fn<(data: unknown) => Promise<ProcessingJob>>()
const findProcessingJobByIdMock = jest.fn<(id: string) => Promise<ProcessingJob | null>>()
const updateProcessingJobMock = jest.fn<(id: string, data: unknown) => Promise<ProcessingJob>>()
const findPublishTasksByUserIdMock =
  jest.fn<
    (
      filters: unknown,
      skip: number,
      take: number,
      sortBy: string,
      sortOrder: string
    ) => Promise<[PublishTask[], number]>
  >()
const findPublishTaskByIdMock = jest.fn<(id: string) => Promise<PublishTask | null>>()
const updatePublishTaskMock = jest.fn<(id: string, data: unknown) => Promise<PublishTask>>()
const findMediaByIdMock = jest.fn<(id: string) => Promise<Media | null>>()
const findShortClipByIdMock = jest.fn<(id: string) => Promise<ShortClip | null>>()
const getUsablePlatformAccountMock =
  jest.fn<(workspaceId: string, platform: string, id: string) => Promise<PlatformAccount>>()
const getWorkspaceMembershipContextMock =
  jest.fn<(workspaceId: string, userId: string) => Promise<{ id: string; role: 'OWNER' | 'MEMBER' }>>()
const publishPublishTaskJobMock = jest.fn<(message: unknown, eta?: string) => Promise<void>>()

jest.unstable_mockModule('./publish-tasks.repository', () => ({
  createProcessingJob: createProcessingJobMock,
  createPublishTask: createPublishTaskMock,
  findMediaById: findMediaByIdMock,
  findProcessingJobById: findProcessingJobByIdMock,
  findPublishTaskById: findPublishTaskByIdMock,
  findPublishTasksByUserId: findPublishTasksByUserIdMock,
  findShortClipById: findShortClipByIdMock,
  updateProcessingJob: updateProcessingJobMock,
  updatePublishTask: updatePublishTaskMock
}))

jest.unstable_mockModule('../platform-accounts/platform-accounts.service', () => ({
  getUsablePlatformAccount: getUsablePlatformAccountMock
}))

jest.unstable_mockModule('../workspace/workspace.service', () => ({
  getWorkspaceMembershipContext: getWorkspaceMembershipContextMock
}))

jest.unstable_mockModule('./publish-tasks.queue', () => ({
  publishPublishTaskJob: publishPublishTaskJobMock
}))

const publishTasksService = await import('./publish-tasks.service')

const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000099'
const publishTaskId = '00000000-0000-4000-8000-000000000002'
const jobId = '00000000-0000-4000-8000-000000000007'
const mediaId = '00000000-0000-4000-8000-000000000003'
const workspaceId = '00000000-0000-4000-8000-000000000008'
const otherWorkspaceId = '00000000-0000-4000-8000-000000000009'
const shortClipId = '00000000-0000-4000-8000-000000000004'
const platformAccountId = '00000000-0000-4000-8000-000000000005'
const replacementPlatformAccountId = '00000000-0000-4000-8000-000000000006'
const now = new Date('2026-06-09T10:00:00.000Z')
const scheduledAt = new Date('2026-06-10T10:00:00.000Z')

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  workspaceId,
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

const createShortClip = (overrides: Partial<ShortClip> = {}): ShortClip => ({
  id: shortClipId,
  mediaId,
  userId,
  transcriptId: null,
  chapterId: null,
  candidateId: null,
  title: 'Short clip',
  caption: 'Short clip caption',
  description: null,
  hashtags: ['#clip'],
  startTime: 10,
  endTime: 45,
  duration: 35,
  transcriptVersion: 1,
  score: 0.8,
  reason: null,
  videoPath: 'clips/media/clip.mp4',
  thumbnailPath: null,
  subtitlePath: null,
  aspectRatio: '9:16',
  status: 'READY',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createPlatformAccount = (overrides: Partial<PlatformAccount> = {}): PlatformAccount => ({
  id: platformAccountId,
  workspaceId,
  connectedByUserId: userId,
  platform: 'FACEBOOK',
  accountName: 'VidPilot Page',
  platformUserId: '123456789',
  accessTokenEncrypted: 'encrypted-access-token',
  refreshTokenEncrypted: null,
  tokenLast4: 'oken',
  expiresAt: null,
  status: 'CONNECTED',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createPublishTask = (overrides: Partial<PublishTask> = {}): PublishTask => ({
  id: publishTaskId,
  userId,
  mediaId,
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
  errorMessage: null,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createProcessingJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: jobId,
  mediaId,
  userId,
  jobType: 'PUBLISH',
  status: 'PENDING',
  progress: 0,
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

describe('publish task service', () => {
  beforeEach(() => {
    createPublishTaskMock.mockReset()
    createProcessingJobMock.mockReset()
    findProcessingJobByIdMock.mockReset()
    updateProcessingJobMock.mockReset()
    findPublishTasksByUserIdMock.mockReset()
    findPublishTaskByIdMock.mockReset()
    updatePublishTaskMock.mockReset()
    findMediaByIdMock.mockReset()
    findShortClipByIdMock.mockReset()
    getUsablePlatformAccountMock.mockReset()
    getWorkspaceMembershipContextMock.mockReset()
    publishPublishTaskJobMock.mockReset()
    getUsablePlatformAccountMock.mockResolvedValue(createPlatformAccount())
    getWorkspaceMembershipContextMock.mockResolvedValue({ id: workspaceId, role: 'MEMBER' })
  })

  it('creates a media publish task with a required connected platform account', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    createPublishTaskMock.mockResolvedValue(createPublishTask({ scheduledAt }))

    const result = await publishTasksService.createPublishTask(userId, {
      mediaId,
      platform: 'FACEBOOK',
      platformAccountId,
      title: 'Video title',
      caption: 'Video caption',
      hashtags: ['#video'],
      scheduledAt
    })

    expect(findMediaByIdMock).toHaveBeenCalledWith(mediaId)
    expect(getUsablePlatformAccountMock).toHaveBeenCalledWith(workspaceId, 'FACEBOOK', platformAccountId)
    expect(createPublishTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        mediaId,
        shortClipId: null,
        platform: 'FACEBOOK',
        platformAccountId,
        status: 'DRAFT',
        scheduledAt
      })
    )
    expect(result).toMatchObject({
      id: publishTaskId,
      mediaId,
      platform: 'FACEBOOK',
      status: 'DRAFT'
    })
  })

  it('creates a short clip publish task with a required connected platform account', async () => {
    findShortClipByIdMock.mockResolvedValue(createShortClip())
    findMediaByIdMock.mockResolvedValue(createMedia())
    createPublishTaskMock.mockResolvedValue(createPublishTask({ mediaId: null, shortClipId }))

    const result = await publishTasksService.createPublishTask(userId, {
      shortClipId,
      platform: 'FACEBOOK',
      platformAccountId,
      hashtags: null
    })

    expect(findShortClipByIdMock).toHaveBeenCalledWith(shortClipId)
    expect(createPublishTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId: null,
        shortClipId,
        hashtags: Prisma.DbNull
      })
    )
    expect(result).toMatchObject({
      shortClipId,
      status: 'DRAFT'
    })
  })

  it('rejects missing, inaccessible, and deleted media targets', async () => {
    findMediaByIdMock.mockResolvedValueOnce(null)
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PUBLISH_TARGET_NOT_FOUND'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ workspaceId: otherWorkspaceId }))
    getWorkspaceMembershipContextMock.mockRejectedValueOnce({
      statusCode: 403,
      code: 'WORKSPACE_FORBIDDEN'
    })
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'WORKSPACE_FORBIDDEN'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ status: 'DELETED' }))
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TARGET_INVALID_STATE'
    })
  })

  it('rejects missing, inaccessible, and deleted short clip targets', async () => {
    findShortClipByIdMock.mockResolvedValueOnce(null)
    await expect(
      publishTasksService.createPublishTask(userId, { shortClipId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PUBLISH_TARGET_NOT_FOUND'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip())
    findMediaByIdMock.mockResolvedValueOnce(createMedia({ workspaceId: otherWorkspaceId }))
    getWorkspaceMembershipContextMock.mockRejectedValueOnce({
      statusCode: 403,
      code: 'WORKSPACE_FORBIDDEN'
    })
    await expect(
      publishTasksService.createPublishTask(userId, { shortClipId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'WORKSPACE_FORBIDDEN'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip({ status: 'DELETED' }))
    await expect(
      publishTasksService.createPublishTask(userId, { shortClipId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TARGET_INVALID_STATE'
    })
  })

  it('propagates unusable shared platform account errors', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())

    getUsablePlatformAccountMock.mockRejectedValueOnce({
      statusCode: 404,
      code: 'PLATFORM_ACCOUNT_NOT_FOUND'
    })
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PLATFORM_ACCOUNT_NOT_FOUND'
    })

    getUsablePlatformAccountMock.mockRejectedValueOnce({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })

    getUsablePlatformAccountMock.mockRejectedValueOnce({
      statusCode: 409,
      code: 'PLATFORM_ACCOUNT_INVALID_STATE'
    })
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PLATFORM_ACCOUNT_INVALID_STATE'
    })
  })

  it('lists publish tasks with filters and pagination', async () => {
    findPublishTasksByUserIdMock.mockResolvedValue([[createPublishTask()], 1])

    const result = await publishTasksService.listPublishTasks(userId, {
      page: 2,
      limit: 5,
      platform: 'FACEBOOK',
      status: 'DRAFT',
      mediaId,
      shortClipId,
      platformAccountId,
      sortBy: 'scheduledAt',
      sortOrder: 'asc'
    })

    expect(findPublishTasksByUserIdMock).toHaveBeenCalledWith(
      {
        userId,
        platform: 'FACEBOOK',
        status: 'DRAFT',
        mediaId,
        shortClipId,
        platformAccountId
      },
      5,
      5,
      'scheduledAt',
      'asc'
    )
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: publishTaskId,
          platform: 'FACEBOOK'
        })
      ],
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1
    })
  })

  it('gets an owned publish task and distinguishes missing and foreign tasks', async () => {
    findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask())
    await expect(publishTasksService.getPublishTask(userId, publishTaskId)).resolves.toMatchObject({
      id: publishTaskId,
      userId
    })

    findPublishTaskByIdMock.mockResolvedValueOnce(null)
    await expect(publishTasksService.getPublishTask(userId, publishTaskId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PUBLISH_TASK_NOT_FOUND'
    })

    findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask({ userId: otherUserId }))
    await expect(publishTasksService.getPublishTask(userId, publishTaskId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
  })

  it('updates editable publish task metadata and validates changed platform account', async () => {
    findPublishTaskByIdMock.mockResolvedValue(createPublishTask({ status: 'FAILED' }))
    findMediaByIdMock.mockResolvedValue(createMedia())
    getUsablePlatformAccountMock.mockResolvedValue(
      createPlatformAccount({ id: replacementPlatformAccountId, platform: 'FACEBOOK' })
    )
    updatePublishTaskMock.mockResolvedValue(
      createPublishTask({
        platformAccountId: replacementPlatformAccountId,
        title: 'Updated title',
        caption: null,
        hashtags: null,
        scheduledAt: null
      })
    )

    const result = await publishTasksService.updatePublishTask(userId, publishTaskId, {
      platformAccountId: replacementPlatformAccountId,
      title: 'Updated title',
      caption: null,
      hashtags: null,
      scheduledAt: null
    })

    expect(getUsablePlatformAccountMock).toHaveBeenCalledWith(workspaceId, 'FACEBOOK', replacementPlatformAccountId)
    expect(updatePublishTaskMock).toHaveBeenCalledWith(publishTaskId, {
      platformAccountId: replacementPlatformAccountId,
      title: 'Updated title',
      caption: null,
      hashtags: Prisma.DbNull,
      scheduledAt: null
    })
    expect(result).toMatchObject({
      platformAccountId: replacementPlatformAccountId,
      title: 'Updated title'
    })
  })

  it('rejects updates for locked publish task statuses', async () => {
    for (const status of ['PUBLISHING', 'PUBLISHED', 'CANCELED'] as const) {
      findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask({ status }))

      await expect(
        publishTasksService.updatePublishTask(userId, publishTaskId, {
          title: 'Updated title'
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'PUBLISH_TASK_LOCKED'
      })
    }

    expect(updatePublishTaskMock).not.toHaveBeenCalled()
  })

  it('publishes a draft media publish task by creating a job and enqueueing it', async () => {
    findPublishTaskByIdMock.mockResolvedValue(createPublishTask())
    findMediaByIdMock.mockResolvedValue(createMedia())
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    updatePublishTaskMock.mockResolvedValue(createPublishTask({ jobId, status: 'PUBLISHING' }))
    publishPublishTaskJobMock.mockResolvedValue()

    const result = await publishTasksService.publishPublishTask(userId, publishTaskId)

    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        userId,
        jobType: 'PUBLISH',
        status: 'PENDING',
        progress: 0,
        input: expect.objectContaining({
          publishTaskId,
          mediaId,
          shortClipId: null,
          platform: 'FACEBOOK',
          platformAccountId,
          scheduledAt: null
        })
      })
    )
    expect(updatePublishTaskMock).toHaveBeenCalledWith(
      publishTaskId,
      expect.objectContaining({
        jobId,
        status: 'PUBLISHING',
        scheduledAt: null,
        errorMessage: null
      })
    )
    expect(publishPublishTaskJobMock).toHaveBeenCalledWith(
      {
        jobId,
        publishTaskId,
        mediaId,
        shortClipId: null,
        userId,
        platform: 'FACEBOOK',
        platformAccountId,
        scheduledAt: null
      },
      undefined
    )
    expect(result.publishTask).toMatchObject({ id: publishTaskId, status: 'PUBLISHING', jobId })
    expect(result.job).toMatchObject({ id: jobId, jobType: 'PUBLISH', status: 'PENDING' })
  })

  it('schedules a failed short clip publish task with a Celery ETA', async () => {
    const futureScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const scheduledAtIso = futureScheduledAt.toISOString()

    findPublishTaskByIdMock.mockResolvedValue(createPublishTask({ mediaId: null, shortClipId, status: 'FAILED' }))
    findShortClipByIdMock.mockResolvedValue(createShortClip())
    findMediaByIdMock.mockResolvedValue(createMedia())
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    updatePublishTaskMock.mockResolvedValue(
      createPublishTask({ mediaId: null, shortClipId, jobId, status: 'SCHEDULED', scheduledAt: futureScheduledAt })
    )
    publishPublishTaskJobMock.mockResolvedValue()

    const result = await publishTasksService.schedulePublishTask(userId, publishTaskId, {
      scheduledAt: futureScheduledAt
    })

    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        jobType: 'PUBLISH',
        input: expect.objectContaining({
          publishTaskId,
          mediaId: null,
          shortClipId,
          scheduledAt: scheduledAtIso
        })
      })
    )
    expect(updatePublishTaskMock).toHaveBeenCalledWith(
      publishTaskId,
      expect.objectContaining({
        jobId,
        status: 'SCHEDULED',
        scheduledAt: futureScheduledAt,
        errorMessage: null
      })
    )
    expect(publishPublishTaskJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId,
        publishTaskId,
        mediaId: null,
        shortClipId,
        scheduledAt: scheduledAtIso
      }),
      scheduledAtIso
    )
    expect(result.publishTask).toMatchObject({ status: 'SCHEDULED', scheduledAt: futureScheduledAt })
  })

  it('cancels a scheduled publish task and fails a pending linked publish job', async () => {
    findPublishTaskByIdMock.mockResolvedValue(createPublishTask({ jobId, status: 'SCHEDULED', scheduledAt }))
    findProcessingJobByIdMock.mockResolvedValue(createProcessingJob())
    updateProcessingJobMock.mockResolvedValue(createProcessingJob({ status: 'FAILED' }))
    updatePublishTaskMock.mockResolvedValue(createPublishTask({ jobId, status: 'CANCELED', scheduledAt }))

    const result = await publishTasksService.cancelPublishTask(userId, publishTaskId)

    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        progress: 0,
        errorMessage: 'Publish task was canceled',
        completedAt: expect.any(Date)
      })
    )
    expect(updatePublishTaskMock).toHaveBeenCalledWith(
      publishTaskId,
      expect.objectContaining({
        status: 'CANCELED',
        errorMessage: null
      })
    )
    expect(result).toMatchObject({ id: publishTaskId, status: 'CANCELED' })
  })

  it('rejects invalid action status transitions', async () => {
    findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask({ status: 'SCHEDULED' }))
    await expect(publishTasksService.publishPublishTask(userId, publishTaskId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TASK_LOCKED'
    })

    findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask({ status: 'PUBLISHING' }))
    await expect(
      publishTasksService.schedulePublishTask(userId, publishTaskId, {
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TASK_LOCKED'
    })

    findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask({ status: 'PUBLISHED' }))
    await expect(publishTasksService.cancelPublishTask(userId, publishTaskId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TASK_LOCKED'
    })

    expect(createProcessingJobMock).not.toHaveBeenCalled()
    expect(updatePublishTaskMock).not.toHaveBeenCalled()
  })

  it('rejects schedule requests in the past', async () => {
    await expect(
      publishTasksService.schedulePublishTask(userId, publishTaskId, {
        scheduledAt: new Date('2026-06-08T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'PUBLISH_SCHEDULE_INVALID'
    })

    expect(findPublishTaskByIdMock).not.toHaveBeenCalled()
  })

  it('revalidates publish targets and platform accounts before starting a publish job', async () => {
    findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask())
    findMediaByIdMock.mockResolvedValueOnce(createMedia({ status: 'DELETED' }))

    await expect(publishTasksService.publishPublishTask(userId, publishTaskId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TARGET_INVALID_STATE'
    })

    findPublishTaskByIdMock.mockResolvedValueOnce(createPublishTask())
    findMediaByIdMock.mockResolvedValueOnce(createMedia())
    getUsablePlatformAccountMock.mockRejectedValueOnce({
      statusCode: 409,
      code: 'PLATFORM_ACCOUNT_INVALID_STATE'
    })

    await expect(publishTasksService.publishPublishTask(userId, publishTaskId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PLATFORM_ACCOUNT_INVALID_STATE'
    })

    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('marks the publish job and task failed when queue publish fails', async () => {
    findPublishTaskByIdMock.mockResolvedValue(createPublishTask())
    findMediaByIdMock.mockResolvedValue(createMedia())
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    updatePublishTaskMock.mockResolvedValueOnce(createPublishTask({ jobId, status: 'PUBLISHING' }))
    updatePublishTaskMock.mockResolvedValueOnce(createPublishTask({ jobId, status: 'FAILED' }))
    updateProcessingJobMock.mockResolvedValue(createProcessingJob({ status: 'FAILED' }))
    publishPublishTaskJobMock.mockRejectedValue(new Error('RabbitMQ unavailable'))

    await expect(publishTasksService.publishPublishTask(userId, publishTaskId)).rejects.toMatchObject({
      statusCode: 502,
      code: 'PUBLISH_QUEUE_PUBLISH_FAILED'
    })

    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        progress: 0,
        errorMessage: 'Failed to publish task job',
        completedAt: expect.any(Date)
      })
    )
    expect(updatePublishTaskMock).toHaveBeenLastCalledWith(
      publishTaskId,
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'Failed to publish task job'
      })
    )
  })
})
