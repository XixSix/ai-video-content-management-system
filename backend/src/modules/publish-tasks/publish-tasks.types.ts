import type {
  MediaType,
  Platform,
  PlatformAccountStatus,
  Prisma,
  PublishStatus
} from '../../infrastructure/db/generated/prisma/client'
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
  errorCode: string | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
  source: PublishTaskSourceData | null
  platformAccount: PublishTaskPlatformAccountData | null
}

export type PublishTaskSourceType = 'MEDIA' | 'PROJECT' | 'SHORT_CLIP'

export interface PublishTaskSourceData {
  type: PublishTaskSourceType
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
  aspectRatio: string | null
  mediaType: MediaType | null
}

export interface PublishTaskPlatformAccountData {
  id: string
  platform: Platform
  accountName: string | null
  avatarUrl: string | null
  status: PlatformAccountStatus
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

export type PublishTaskSortField = 'createdAt' | 'scheduledAt' | 'publishedAt'
export type SortOrder = 'asc' | 'desc'
