import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  Prisma,
  type Media,
  type PlatformAccount,
  type PublishTask,
  type ShortClip
} from '../../infrastructure/db/generated/prisma/client'

const createPublishTaskMock = jest.fn<(data: unknown) => Promise<PublishTask>>()
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
const findPlatformAccountByIdMock = jest.fn<(id: string) => Promise<PlatformAccount | null>>()

jest.unstable_mockModule('./publish-tasks.repository', () => ({
  createPublishTask: createPublishTaskMock,
  findMediaById: findMediaByIdMock,
  findPlatformAccountById: findPlatformAccountByIdMock,
  findPublishTaskById: findPublishTaskByIdMock,
  findPublishTasksByUserId: findPublishTasksByUserIdMock,
  findShortClipById: findShortClipByIdMock,
  updatePublishTask: updatePublishTaskMock
}))

const publishTasksService = await import('./publish-tasks.service')

const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000099'
const publishTaskId = '00000000-0000-4000-8000-000000000002'
const mediaId = '00000000-0000-4000-8000-000000000003'
const shortClipId = '00000000-0000-4000-8000-000000000004'
const platformAccountId = '00000000-0000-4000-8000-000000000005'
const replacementPlatformAccountId = '00000000-0000-4000-8000-000000000006'
const now = new Date('2026-06-09T10:00:00.000Z')
const scheduledAt = new Date('2026-06-10T10:00:00.000Z')

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  type: 'VIDEO',
  title: 'Video test',
  description: null,
  originalFilename: 'video.mp4',
  s3Bucket: 'avcms-media',
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
  userId,
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

describe('publish task service', () => {
  beforeEach(() => {
    createPublishTaskMock.mockReset()
    findPublishTasksByUserIdMock.mockReset()
    findPublishTaskByIdMock.mockReset()
    updatePublishTaskMock.mockReset()
    findMediaByIdMock.mockReset()
    findShortClipByIdMock.mockReset()
    findPlatformAccountByIdMock.mockReset()
  })

  it('creates a media publish task with a required connected platform account', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findPlatformAccountByIdMock.mockResolvedValue(createPlatformAccount())
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
    expect(findPlatformAccountByIdMock).toHaveBeenCalledWith(platformAccountId)
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
    findPlatformAccountByIdMock.mockResolvedValue(createPlatformAccount())
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

  it('rejects missing, forbidden, and deleted media targets', async () => {
    findMediaByIdMock.mockResolvedValueOnce(null)
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PUBLISH_TARGET_NOT_FOUND'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ userId: otherUserId }))
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ status: 'DELETED' }))
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TARGET_INVALID_STATE'
    })
  })

  it('rejects missing, forbidden, and deleted short clip targets', async () => {
    findShortClipByIdMock.mockResolvedValueOnce(null)
    await expect(
      publishTasksService.createPublishTask(userId, { shortClipId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PUBLISH_TARGET_NOT_FOUND'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip({ userId: otherUserId }))
    await expect(
      publishTasksService.createPublishTask(userId, { shortClipId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip({ status: 'DELETED' }))
    await expect(
      publishTasksService.createPublishTask(userId, { shortClipId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PUBLISH_TARGET_INVALID_STATE'
    })
  })

  it('rejects missing, forbidden, wrong-platform, and disconnected platform accounts', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())

    findPlatformAccountByIdMock.mockResolvedValueOnce(null)
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PLATFORM_ACCOUNT_NOT_FOUND'
    })

    findPlatformAccountByIdMock.mockResolvedValueOnce(createPlatformAccount({ userId: otherUserId }))
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })

    findPlatformAccountByIdMock.mockResolvedValueOnce(createPlatformAccount({ platform: 'YOUTUBE' }))
    await expect(
      publishTasksService.createPublishTask(userId, { mediaId, platform: 'FACEBOOK', platformAccountId })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PLATFORM_ACCOUNT_INVALID_STATE'
    })

    findPlatformAccountByIdMock.mockResolvedValueOnce(createPlatformAccount({ status: 'REVOKED' }))
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
    findPlatformAccountByIdMock.mockResolvedValue(
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

    expect(findPlatformAccountByIdMock).toHaveBeenCalledWith(replacementPlatformAccountId)
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
})
