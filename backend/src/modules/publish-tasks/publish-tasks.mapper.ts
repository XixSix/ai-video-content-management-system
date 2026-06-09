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
