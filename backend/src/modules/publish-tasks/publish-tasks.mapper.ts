import type { ProcessingJob } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { PublishTaskRecord } from './publish-tasks.repository'
import type { PublishTaskData, PublishTaskPlatformAccountData, PublishTaskSourceData } from './publish-tasks.types'

const inferAspectRatio = (width: number | null, height: number | null): string | null => {
  if (!width || !height) {
    return null
  }

  const ratio = width / height

  if (Math.abs(ratio - 16 / 9) < 0.08) {
    return '16:9'
  }

  if (Math.abs(ratio - 9 / 16) < 0.08) {
    return '9:16'
  }

  if (Math.abs(ratio - 1) < 0.08) {
    return '1:1'
  }

  return `${width}:${height}`
}

const toSourceData = (task: PublishTaskRecord): PublishTaskSourceData | null => {
  if (task.media) {
    return {
      type: 'MEDIA',
      id: task.media.id,
      title: task.media.title ?? task.media.originalFilename,
      thumbnailUrl: null,
      duration: task.media.duration,
      aspectRatio: inferAspectRatio(task.media.width, task.media.height),
      mediaType: task.media.type
    }
  }

  if (task.project) {
    return {
      type: 'PROJECT',
      id: task.project.id,
      title: task.project.title,
      thumbnailUrl: null,
      duration: task.project.duration ?? task.project.sourceMedia?.duration ?? null,
      aspectRatio: task.project.aspectRatio,
      mediaType: task.project.sourceMedia?.type ?? null
    }
  }

  if (task.shortClip) {
    return {
      type: 'SHORT_CLIP',
      id: task.shortClip.id,
      title: task.shortClip.candidate?.title ?? task.shortClip.media.title ?? task.shortClip.media.originalFilename,
      thumbnailUrl: null,
      duration: task.shortClip.candidate?.duration ?? null,
      aspectRatio: task.shortClip.aspectRatio,
      mediaType: task.shortClip.media.type
    }
  }

  return null
}

const toPlatformAccountData = (task: PublishTaskRecord): PublishTaskPlatformAccountData | null => {
  if (!task.platformAccount) {
    return null
  }

  return {
    id: task.platformAccount.id,
    platform: task.platformAccount.platform,
    accountName: task.platformAccount.accountName,
    avatarUrl: task.platformAccount.avatarUrl,
    status: task.platformAccount.status
  }
}

export const toPublishTaskData = (task: PublishTaskRecord): PublishTaskData => ({
  id: task.id,
  userId: task.userId,
  mediaId: task.mediaId,
  projectId: task.projectId,
  shortClipId: task.shortClipId,
  platformAccountId: task.platformAccountId,
  jobId: task.jobId,
  platform: task.platform,
  title: task.title,
  caption: task.caption,
  description: task.description,
  hashtags: task.hashtags,
  status: task.status,
  scheduledAt: task.scheduledAt,
  publishedAt: task.publishedAt,
  platformPostId: task.platformPostId,
  platformPostUrl: task.platformPostUrl,
  errorMessage: task.errorMessage,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  source: toSourceData(task),
  platformAccount: toPlatformAccountData(task)
})

export const toJobResponseData = (job: ProcessingJob): JobResponseData => ({
  id: job.id,
  mediaId: job.mediaId,
  jobType: job.jobType,
  status: job.status,
  progress: job.progress,
  errorMessage: job.errorMessage,
  output: job.output,
  attemptCount: job.attemptCount,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  startedAt: job.startedAt,
  completedAt: job.completedAt
})
