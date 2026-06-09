import {
  PlatformAccountStatus,
  Prisma,
  PublishStatus,
  type Media,
  type Platform,
  type PlatformAccount,
  type PublishTask,
  type ShortClip
} from '../../infrastructure/db/generated/prisma/client'
import { toPublishTaskData } from './publish-tasks.mapper'
import * as publishTasksRepo from './publish-tasks.repository'
import type { CreatePublishTaskBody, ListPublishTasksQuery, UpdatePublishTaskBody } from './publish-tasks.schema'
import { PublishTasksError } from './publish-tasks.error'
import type { PaginatedResult, PublishTaskData } from './publish-tasks.types'

const editableStatuses: PublishStatus[] = [PublishStatus.DRAFT, PublishStatus.SCHEDULED, PublishStatus.FAILED]

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
