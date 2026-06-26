import type { Platform, Prisma, PublishStatus, PublishTask } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'

export const PUBLISH_QUEUE_NAME = 'publish_queue'
export const PUBLISH_TASK_NAME = 'publish'
export const PUBLISH_CELERY_TASK_NAME = 'publish_task'

export interface PublishTaskData {
  id: string
  userId: string
  mediaId: string | null
  projectId: string | null
  shortClipId: string | null
  platformAccountId: string | null
  jobId: string | null
  platform: Platform
  title: string | null
  caption: string | null
  description: string | null
  hashtags: Prisma.JsonValue | null
  status: PublishStatus
  scheduledAt: Date | null
  publishedAt: Date | null
  platformPostId: string | null
  platformPostUrl: string | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PublishTaskJobResult {
  publishTask: PublishTaskData
  job: JobResponseData
}

export type PublishTaskRecord = PublishTask
export type PublishTaskSortField = 'createdAt' | 'scheduledAt' | 'publishedAt'
export type SortOrder = 'asc' | 'desc'
