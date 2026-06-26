import type { JobStatus, JobType, Prisma } from '../../infrastructure/db/generated/prisma/client'

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface JobResponseData {
  id: string
  mediaId: string
  jobType: JobType
  status: JobStatus
  progress: number | null
  errorMessage: string | null
  output: Prisma.JsonValue | null
  attemptCount: number
  createdAt: Date
  updatedAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

export interface JobEventData extends JobResponseData {
  jobId: string
}

export type JobEventName = 'job.updated' | 'job.completed' | 'job.failed' | 'job.heartbeat'
