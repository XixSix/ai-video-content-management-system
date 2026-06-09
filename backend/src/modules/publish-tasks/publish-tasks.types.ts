import type { Platform, Prisma, PublishStatus, PublishTask } from '../../infrastructure/db/generated/prisma/client'

export interface PublishTaskData {
  id: string
  userId: string
  mediaId: string | null
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

export type PublishTaskRecord = PublishTask
export type PublishTaskSortField = 'createdAt' | 'scheduledAt' | 'publishedAt'
export type SortOrder = 'asc' | 'desc'
