import {
  JobStatus,
  JobType,
  PlatformAccountStatus,
  Prisma,
  PublishStatus,
  type Media,
  type Platform,
  type PlatformAccount,
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

const editableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.SCHEDULED, PublishStatus.FAILED]
const publishableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.FAILED]
const cancelableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.SCHEDULED]
const cancelableJobStatuses: JobStatus[] = [JobStatus.PENDING, JobStatus.QUEUED]
const publishQueueFailureMessage = 'Failed to publish task job'

export const createPublishTask = async (userId: string, body: CreatePublishTaskBody): Promise<PublishTaskData> => {
  await ensurePublishTarget(userId, body)
  await getUsablePlatformAccount(userId, body.platform, body.platformAccountId)

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
    await getUsablePlatformAccount(userId, task.platform, body.platformAccountId!)
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
): Promise<void> => {
  if (body.mediaId) {
    await getOwnedPublishableMedia(userId, body.mediaId)
    return
  }

  if (body.shortClipId) {
    await getOwnedPublishableShortClip(userId, body.shortClipId)
  }
}

const getPublishContext = async (
  userId: string,
  task: PublishTask
): Promise<{ jobMediaId: string; platformAccountId: string }> => {
  const jobMediaId = await getPublishTaskMediaId(userId, task)

  if (!task.platformAccountId) {
    throw PublishTasksError.platformAccountNotFound()
  }

  await getUsablePlatformAccount(userId, task.platform, task.platformAccountId)

  return {
    jobMediaId,
    platformAccountId: task.platformAccountId
  }
}

const getPublishTaskMediaId = async (userId: string, task: PublishTask): Promise<string> => {
  if (task.mediaId) {
    const media = await getOwnedPublishableMedia(userId, task.mediaId)
    return media.id
  }

  if (task.shortClipId) {
    const shortClip = await getOwnedPublishableShortClip(userId, task.shortClipId)
    return shortClip.mediaId
  }

  throw PublishTasksError.targetNotFound()
}

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

const getOwnedPublishableMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await publishTasksRepo.findMediaById(mediaId)

  if (!media) {
    throw PublishTasksError.targetNotFound()
  }

  if (media.userId !== userId) {
    throw PublishTasksError.targetForbidden()
  }

  if (media.status === 'DELETED') {
    throw PublishTasksError.invalidTargetState('Deleted media cannot be published')
  }

  return media
}

const getOwnedPublishableShortClip = async (userId: string, shortClipId: string): Promise<ShortClip> => {
  const shortClip = await publishTasksRepo.findShortClipById(shortClipId)

  if (!shortClip) {
    throw PublishTasksError.targetNotFound()
  }

  if (shortClip.userId !== userId) {
    throw PublishTasksError.targetForbidden()
  }

  if (shortClip.status === 'DELETED') {
    throw PublishTasksError.invalidTargetState('Deleted short clip cannot be published')
  }

  return shortClip
}

const getUsablePlatformAccount = async (
  userId: string,
  platform: Platform,
  platformAccountId: string
): Promise<PlatformAccount> => {
  const account = await publishTasksRepo.findPlatformAccountById(platformAccountId)

  if (!account) {
    throw PublishTasksError.platformAccountNotFound()
  }

  if (account.userId !== userId) {
    throw PublishTasksError.platformAccountForbidden()
  }

  if (account.platform !== platform || account.status !== PlatformAccountStatus.CONNECTED) {
    throw PublishTasksError.invalidPlatformAccount()
  }

  return account
}
