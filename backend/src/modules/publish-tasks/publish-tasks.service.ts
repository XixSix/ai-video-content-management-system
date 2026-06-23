import {
  JobStatus,
  JobType,
  Prisma,
  PublishStatus,
  type Media,
  type ProcessingJob,
  type PublishTask,
  type ShortClip
} from '../../infrastructure/db/generated/prisma/client'
import { toJobResponseData, toPublishTaskData } from './publish-tasks.mapper'
import * as publishTasksQueue from './publish-tasks.queue'
import * as publishTasksRepo from './publish-tasks.repository'
import type {
  CreatePublishTaskBody,
  ListPublishTasksQuery,
  SchedulePublishTaskBody,
  UpdatePublishTaskBody
} from './publish-tasks.schema'
import { PublishTasksError } from './publish-tasks.error'
import type { PaginatedResult, PublishTaskData, PublishTaskJobResult } from './publish-tasks.types'
import * as platformAccountsService from '../platform-accounts/platform-accounts.service'
import * as workspaceService from '../workspace/workspace.service'

const editableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.SCHEDULED, PublishStatus.FAILED]
const publishableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.FAILED]
const cancelableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.SCHEDULED]
const cancelableJobStatuses: JobStatus[] = [JobStatus.PENDING, JobStatus.QUEUED]
const publishQueueFailureMessage = 'Failed to publish task job'

export const createPublishTask = async (userId: string, body: CreatePublishTaskBody): Promise<PublishTaskData> => {
  const workspaceId = await ensurePublishTarget(userId, body)
  await platformAccountsService.getUsablePlatformAccount(workspaceId, body.platform, body.platformAccountId)

  const task = await publishTasksRepo.createPublishTask({
    userId,
    mediaId: body.mediaId ?? null,
    shortClipId: body.shortClipId ?? null,
    platformAccountId: body.platformAccountId,
    platform: body.platform,
    title: body.title ?? null,
    caption: body.caption ?? null,
    description: body.description ?? null,
    hashtags: body.hashtags === null ? Prisma.DbNull : body.hashtags,
    scheduledAt: body.scheduledAt ?? null,
    status: PublishStatus.DRAFT
  })

  return toPublishTaskData(task)
}

export const listPublishTasks = async (
  userId: string,
  query: ListPublishTasksQuery
): Promise<PaginatedResult<PublishTaskData>> => {
  const page = query.page
  const limit = query.limit
  const skip = (page - 1) * limit
  const [items, total] = await publishTasksRepo.findPublishTasksByUserId(
    {
      userId,
      platform: query.platform,
      status: query.status,
      mediaId: query.mediaId,
      shortClipId: query.shortClipId,
      platformAccountId: query.platformAccountId
    },
    skip,
    limit,
    query.sortBy,
    query.sortOrder
  )

  return {
    items: items.map(toPublishTaskData),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

export const getPublishTask = async (userId: string, publishTaskId: string): Promise<PublishTaskData> => {
  const task = await getOwnedPublishTask(userId, publishTaskId)

  return toPublishTaskData(task)
}

export const updatePublishTask = async (
  userId: string,
  publishTaskId: string,
  body: UpdatePublishTaskBody
): Promise<PublishTaskData> => {
  const task = await getOwnedPublishTask(userId, publishTaskId)

  if (!editableStatuses.includes(task.status)) {
    throw PublishTasksError.locked()
  }

  const data: Prisma.PublishTaskUncheckedUpdateInput = {}

  if (Object.hasOwn(body, 'platformAccountId')) {
    const workspaceId = await getPublishTaskWorkspaceId(userId, task)
    await platformAccountsService.getUsablePlatformAccount(workspaceId, task.platform, body.platformAccountId!)
    data.platformAccountId = body.platformAccountId
  }

  if (Object.hasOwn(body, 'title')) {
    data.title = body.title
  }

  if (Object.hasOwn(body, 'caption')) {
    data.caption = body.caption
  }

  if (Object.hasOwn(body, 'description')) {
    data.description = body.description
  }

  if (Object.hasOwn(body, 'hashtags')) {
    data.hashtags = body.hashtags === null ? Prisma.DbNull : body.hashtags
  }

  if (Object.hasOwn(body, 'scheduledAt')) {
    data.scheduledAt = body.scheduledAt
  }

  const updatedTask = await publishTasksRepo.updatePublishTask(task.id, data)

  return toPublishTaskData(updatedTask)
}

export const publishPublishTask = async (userId: string, publishTaskId: string): Promise<PublishTaskJobResult> => {
  return startPublishTask(userId, publishTaskId, null)
}

export const schedulePublishTask = async (
  userId: string,
  publishTaskId: string,
  body: SchedulePublishTaskBody
): Promise<PublishTaskJobResult> => {
  if (body.scheduledAt.getTime() <= Date.now()) {
    throw PublishTasksError.invalidSchedule('scheduledAt must be in the future')
  }

  return startPublishTask(userId, publishTaskId, body.scheduledAt)
}

export const cancelPublishTask = async (userId: string, publishTaskId: string): Promise<PublishTaskData> => {
  const task = await getOwnedPublishTask(userId, publishTaskId)

  if (!cancelableStatuses.includes(task.status)) {
    throw PublishTasksError.locked('Publish task cannot be canceled in its current status')
  }

  const job = task.jobId ? await publishTasksRepo.findProcessingJobById(task.jobId) : null

  if (job && job.userId === userId && job.jobType === JobType.PUBLISH && cancelableJobStatuses.includes(job.status)) {
    await publishTasksRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Publish task was canceled',
      completedAt: new Date()
    })
  }

  const updatedTask = await publishTasksRepo.updatePublishTask(task.id, {
    status: PublishStatus.CANCELED,
    errorMessage: null
  })

  return toPublishTaskData(updatedTask)
}

const startPublishTask = async (
  userId: string,
  publishTaskId: string,
  scheduledAt: Date | null
): Promise<PublishTaskJobResult> => {
  const task = await getOwnedPublishTask(userId, publishTaskId)

  if (!publishableStatuses.includes(task.status)) {
    throw PublishTasksError.locked('Publish task cannot be published in its current status')
  }

  const publishContext = await getPublishContext(userId, task)
  const scheduledAtIso = scheduledAt?.toISOString() ?? null
  const job = await publishTasksRepo.createProcessingJob({
    mediaId: publishContext.jobMediaId,
    userId,
    jobType: JobType.PUBLISH,
    status: JobStatus.PENDING,
    progress: 0,
    input: {
      publishTaskId: task.id,
      mediaId: task.mediaId,
      shortClipId: task.shortClipId,
      platform: task.platform,
      platformAccountId: publishContext.platformAccountId,
      scheduledAt: scheduledAtIso
    }
  })

  const updatedTask = await publishTasksRepo.updatePublishTask(task.id, {
    jobId: job.id,
    status: scheduledAt ? PublishStatus.SCHEDULED : PublishStatus.PUBLISHING,
    scheduledAt,
    errorMessage: null
  })

  try {
    await publishTasksQueue.publishPublishTaskJob(
      {
        jobId: job.id,
        publishTaskId: task.id,
        mediaId: task.mediaId,
        shortClipId: task.shortClipId,
        userId,
        platform: task.platform,
        platformAccountId: publishContext.platformAccountId,
        scheduledAt: scheduledAtIso
      },
      scheduledAtIso ?? undefined
    )
  } catch {
    await markPublishJobFailed(job, task.id)
    throw PublishTasksError.queuePublishFailed()
  }

  return {
    publishTask: toPublishTaskData(updatedTask),
    job: toJobResponseData(job)
  }
}

const markPublishJobFailed = async (job: ProcessingJob, publishTaskId: string): Promise<void> => {
  await Promise.all([
    publishTasksRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: publishQueueFailureMessage,
      completedAt: new Date()
    }),
    publishTasksRepo.updatePublishTask(publishTaskId, {
      status: PublishStatus.FAILED,
      errorMessage: publishQueueFailureMessage
    })
  ])
}

const ensurePublishTarget = async (
  userId: string,
  body: Pick<CreatePublishTaskBody, 'mediaId' | 'shortClipId'>
): Promise<string> => {
  if (body.mediaId) {
    const media = await getAccessiblePublishableMedia(userId, body.mediaId)
    return media.workspaceId
  }

  if (body.shortClipId) {
    const { media } = await getAccessiblePublishableShortClip(userId, body.shortClipId)
    return media.workspaceId
  }

  throw PublishTasksError.targetNotFound()
}

const getPublishContext = async (
  userId: string,
  task: PublishTask
): Promise<{ jobMediaId: string; platformAccountId: string }> => {
  const { mediaId: jobMediaId, workspaceId } = await getPublishTaskTargetContext(userId, task)

  if (!task.platformAccountId) {
    throw PublishTasksError.platformAccountNotFound()
  }

  await platformAccountsService.getUsablePlatformAccount(workspaceId, task.platform, task.platformAccountId)

  return {
    jobMediaId,
    platformAccountId: task.platformAccountId
  }
}

const getPublishTaskTargetContext = async (
  userId: string,
  task: PublishTask
): Promise<{ mediaId: string; workspaceId: string }> => {
  if (task.mediaId) {
    const media = await getAccessiblePublishableMedia(userId, task.mediaId)
    return { mediaId: media.id, workspaceId: media.workspaceId }
  }

  if (task.shortClipId) {
    const { media, shortClip } = await getAccessiblePublishableShortClip(userId, task.shortClipId)
    return { mediaId: shortClip.mediaId, workspaceId: media.workspaceId }
  }

  throw PublishTasksError.targetNotFound()
}

const getPublishTaskWorkspaceId = async (userId: string, task: PublishTask): Promise<string> =>
  (await getPublishTaskTargetContext(userId, task)).workspaceId

const getOwnedPublishTask = async (userId: string, publishTaskId: string): Promise<PublishTask> => {
  const task = await publishTasksRepo.findPublishTaskById(publishTaskId)

  if (!task) {
    throw PublishTasksError.notFound()
  }

  if (task.userId !== userId) {
    throw PublishTasksError.forbidden()
  }

  return task
}

const getAccessiblePublishableMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await publishTasksRepo.findMediaById(mediaId)

  if (!media) {
    throw PublishTasksError.targetNotFound()
  }

  await workspaceService.getWorkspaceMembershipContext(media.workspaceId, userId)

  if (media.status === 'DELETED') {
    throw PublishTasksError.invalidTargetState('Deleted media cannot be published')
  }

  return media
}

const getAccessiblePublishableShortClip = async (
  userId: string,
  shortClipId: string
): Promise<{ shortClip: ShortClip; media: Media }> => {
  const shortClip = await publishTasksRepo.findShortClipById(shortClipId)

  if (!shortClip) {
    throw PublishTasksError.targetNotFound()
  }

  if (shortClip.status === 'DELETED') {
    throw PublishTasksError.invalidTargetState('Deleted short clip cannot be published')
  }

  const media = await getAccessiblePublishableMedia(userId, shortClip.mediaId)

  return { shortClip, media }
}
