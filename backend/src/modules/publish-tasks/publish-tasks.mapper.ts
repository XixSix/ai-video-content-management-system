import type { ProcessingJob } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { PublishTaskData, PublishTaskRecord } from './publish-tasks.types'

export const toPublishTaskData = (task: PublishTaskRecord): PublishTaskData => ({
  id: task.id,
  userId: task.userId,
  mediaId: task.mediaId,
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
  updatedAt: task.updatedAt
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
