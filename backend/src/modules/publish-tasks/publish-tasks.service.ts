import {
  MediaStatus,
  MediaType,
  JobStatus,
  JobType,
  Prisma,
  PublishStatus,
  ShortClipStatus,
  type Media,
  type GeneratedAsset,
  type ProcessingJob
} from '../../infrastructure/db/generated/prisma/client'
import { EXPORT_RENDER_TASK_NAME, RENDER_EXPORTS_QUEUE_NAME } from '../render-exports/render-exports.types'
import * as renderExportsQueue from '../render-exports/render-exports.queue'
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
import {
  PUBLISH_CELERY_TASK_NAME,
  PUBLISH_QUEUE_NAME,
  type PaginatedResult,
  type PublishTaskData,
  type PublishTaskJobResult
} from './publish-tasks.types'
import * as platformAccountsService from '../platform-accounts/platform-accounts.service'
import * as workspaceService from '../workspace/workspace.service'

const editableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.SCHEDULED, PublishStatus.FAILED]
const publishableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.FAILED]
const cancelableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.SCHEDULED]
const cancelableJobStatuses: JobStatus[] = [JobStatus.PENDING, JobStatus.QUEUED]
const publishQueueFailureMessage = 'Failed to publish task job'
const renderQueueFailureMessage = 'Failed to publish render export job'

interface PublishContext {
  jobMediaId: string
  workspaceId: string
  platformAccountId: string
  project?: publishTasksRepo.PublishProjectRecord
  exportAsset?: GeneratedAsset | null
}

export const createPublishTask = async (userId: string, body: CreatePublishTaskBody): Promise<PublishTaskData> => {
  const workspaceId = await ensurePublishTarget(userId, body)
  await platformAccountsService.getUsablePlatformAccount(workspaceId, body.platform, body.platformAccountId)

  const task = await publishTasksRepo.createPublishTask({
    userId,
    mediaId: body.mediaId ?? null,
    projectId: body.projectId ?? null,
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
      search: query.search,
      platform: query.platform,
      status: query.status,
      mediaId: query.mediaId,
      projectId: query.projectId,
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

  if (
    job &&
    job.userId === userId &&
    (job.jobType === JobType.PUBLISH || job.jobType === JobType.EXPORT_RENDER) &&
    cancelableJobStatuses.includes(job.status)
  ) {
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

  if (publishContext.project) {
    return startProjectPublishTask(userId, task, publishContext, scheduledAt)
  }

  return startDirectPublishTask(userId, task, publishContext, scheduledAt)
}

const startDirectPublishTask = async (
  userId: string,
  task: publishTasksRepo.PublishTaskRecord,
  publishContext: PublishContext,
  scheduledAt: Date | null
): Promise<PublishTaskJobResult> => {
  const scheduledAtIso = scheduledAt?.toISOString() ?? null
  const job = await publishTasksRepo.createProcessingJob({
    mediaId: publishContext.jobMediaId,
    userId,
    projectId: task.projectId,
    jobType: JobType.PUBLISH,
    status: JobStatus.PENDING,
    progress: 0,
    queueName: PUBLISH_QUEUE_NAME,
    taskName: PUBLISH_CELERY_TASK_NAME,
    input: {
      publishTaskId: task.id,
      mediaId: task.mediaId,
      projectId: task.projectId,
      shortClipId: task.shortClipId,
      exportAssetId: publishContext.exportAsset?.id ?? null,
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
        projectId: task.projectId,
        shortClipId: task.shortClipId,
        exportAssetId: publishContext.exportAsset?.id ?? null,
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

const startProjectPublishTask = async (
  userId: string,
  task: publishTasksRepo.PublishTaskRecord,
  publishContext: PublishContext,
  scheduledAt: Date | null
): Promise<PublishTaskJobResult> => {
  if (publishContext.exportAsset) {
    return startDirectPublishTask(userId, task, publishContext, scheduledAt)
  }

  const project = publishContext.project!
  const scheduledAtIso = scheduledAt?.toISOString() ?? null
  const job = await publishTasksRepo.createProcessingJob({
    mediaId: publishContext.jobMediaId,
    userId,
    projectId: project.id,
    jobType: JobType.EXPORT_RENDER,
    status: JobStatus.PENDING,
    progress: 0,
    queueName: RENDER_EXPORTS_QUEUE_NAME,
    taskName: EXPORT_RENDER_TASK_NAME,
    input: {
      projectId: project.id,
      workspaceId: project.workspaceId,
      mediaId: publishContext.jobMediaId,
      editorSnapshotId: project.editorSnapshot!.id,
      editorSnapshotVersion: project.editorSnapshot!.version,
      publishTaskId: task.id,
      publishScheduledAt: scheduledAtIso
    }
  })

  const updatedTask = await publishTasksRepo.updatePublishTask(task.id, {
    jobId: job.id,
    status: scheduledAt ? PublishStatus.SCHEDULED : PublishStatus.PUBLISHING,
    scheduledAt,
    errorMessage: null
  })

  try {
    await renderExportsQueue.publishRenderExportJob({
      jobId: job.id,
      mediaId: publishContext.jobMediaId,
      projectId: project.id,
      workspaceId: project.workspaceId,
      userId
    })
  } catch {
    await markJobAndTaskFailed(job, task.id, renderQueueFailureMessage)
    throw PublishTasksError.queuePublishFailed(renderQueueFailureMessage)
  }

  return {
    publishTask: toPublishTaskData(updatedTask),
    job: toJobResponseData(job)
  }
}

const markPublishJobFailed = async (job: ProcessingJob, publishTaskId: string): Promise<void> => {
  await markJobAndTaskFailed(job, publishTaskId, publishQueueFailureMessage)
}

const markJobAndTaskFailed = async (job: ProcessingJob, publishTaskId: string, message: string): Promise<void> => {
  await Promise.all([
    publishTasksRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: message,
      completedAt: new Date()
    }),
    publishTasksRepo.updatePublishTask(publishTaskId, {
      status: PublishStatus.FAILED,
      errorMessage: message
    })
  ])
}

const ensurePublishTarget = async (
  userId: string,
  body: Pick<CreatePublishTaskBody, 'mediaId' | 'projectId' | 'shortClipId'>
): Promise<string> => {
  if (body.mediaId) {
    const media = await getAccessiblePublishableMedia(userId, body.mediaId)
    return media.workspaceId
  }

  if (body.shortClipId) {
    const { media } = await getAccessiblePublishableShortClip(userId, body.shortClipId)
    return media.workspaceId
  }

  if (body.projectId) {
    const { project } = await getAccessiblePublishableProject(userId, body.projectId)
    return project.workspaceId
  }

  throw PublishTasksError.targetNotFound()
}

const getPublishContext = async (userId: string, task: publishTasksRepo.PublishTaskRecord): Promise<PublishContext> => {
  const targetContext = await getPublishTaskTargetContext(userId, task)

  if (!task.platformAccountId) {
    throw PublishTasksError.platformAccountNotFound()
  }

  await platformAccountsService.getUsablePlatformAccount(
    targetContext.workspaceId,
    task.platform,
    task.platformAccountId
  )

  return {
    ...targetContext,
    platformAccountId: task.platformAccountId
  }
}

const getPublishTaskTargetContext = async (
  userId: string,
  task: publishTasksRepo.PublishTaskRecord
): Promise<Omit<PublishContext, 'platformAccountId'>> => {
  if (task.mediaId) {
    const media = await getAccessiblePublishableMedia(userId, task.mediaId)
    return { jobMediaId: media.id, workspaceId: media.workspaceId }
  }

  if (task.projectId) {
    const { project, exportAsset } = await getAccessiblePublishableProject(userId, task.projectId)
    return {
      jobMediaId: project.sourceMedia!.id,
      workspaceId: project.workspaceId,
      project,
      exportAsset
    }
  }

  if (task.shortClipId) {
    const { media, shortClip } = await getAccessiblePublishableShortClip(userId, task.shortClipId)
    return { jobMediaId: shortClip.mediaId, workspaceId: media.workspaceId }
  }

  throw PublishTasksError.targetNotFound()
}

const getPublishTaskWorkspaceId = async (userId: string, task: publishTasksRepo.PublishTaskRecord): Promise<string> =>
  (await getPublishTaskTargetContext(userId, task)).workspaceId

const getOwnedPublishTask = async (
  userId: string,
  publishTaskId: string
): Promise<publishTasksRepo.PublishTaskRecord> => {
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

  if (media.status !== MediaStatus.UPLOADED) {
    throw PublishTasksError.invalidTargetState(`Cannot publish media in status ${media.status}`)
  }

  if (media.type !== MediaType.VIDEO) {
    throw PublishTasksError.invalidTargetState('Publishing requires video media')
  }

  return media
}

const getAccessiblePublishableShortClip = async (
  userId: string,
  shortClipId: string
): Promise<{ shortClip: publishTasksRepo.PublishShortClipRecord; media: Media }> => {
  const shortClip = await publishTasksRepo.findShortClipById(shortClipId)

  if (!shortClip) {
    throw PublishTasksError.targetNotFound()
  }

  if (shortClip.status === 'DELETED') {
    throw PublishTasksError.invalidTargetState('Deleted short clip cannot be published')
  }

  if (shortClip.status !== ShortClipStatus.READY) {
    throw PublishTasksError.invalidTargetState(`Cannot publish short clip in status ${shortClip.status}`)
  }

  if (shortClip.generatedAssets.length < 1) {
    throw PublishTasksError.invalidTargetState('Short clip video output is required before publishing')
  }

  const media = await getAccessiblePublishableMedia(userId, shortClip.mediaId)

  return { shortClip, media }
}

const getAccessiblePublishableProject = async (
  userId: string,
  projectId: string
): Promise<{ project: publishTasksRepo.PublishProjectRecord; exportAsset: GeneratedAsset | null }> => {
  const project = await publishTasksRepo.findProjectById(projectId)

  if (!project || publishTasksRepo.isDeletedProject(project.status)) {
    throw PublishTasksError.targetNotFound()
  }

  await workspaceService.getWorkspaceMembershipContext(project.workspaceId, userId)

  if (project.userId !== userId) {
    throw PublishTasksError.forbidden('Publish project does not belong to the current user')
  }

  if (!project.sourceMedia) {
    throw PublishTasksError.invalidTargetState('Project source media is required before publishing')
  }

  if (project.sourceMedia.status !== MediaStatus.UPLOADED) {
    throw PublishTasksError.invalidTargetState(
      `Cannot publish project source media in status ${project.sourceMedia.status}`
    )
  }

  if (project.sourceMedia.type !== MediaType.VIDEO) {
    throw PublishTasksError.invalidTargetState('Project publishing requires video source media')
  }

  if (!project.editorSnapshot) {
    throw PublishTasksError.invalidTargetState('Project editor snapshot is required before publishing')
  }

  const exportAsset = await publishTasksRepo.findFreshProjectExportAsset(
    project.id,
    project.editorSnapshot.id,
    project.editorSnapshot.version
  )

  return { project, exportAsset }
}
