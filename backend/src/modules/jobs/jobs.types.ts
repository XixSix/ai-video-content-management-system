import type { JobStatus, JobType, Prisma } from '../../infrastructure/db/generated/prisma/client'

export interface JobResponseData {
  id: string
  mediaId: string
  jobType: JobType
  status: JobStatus
  progress: number | null
  currentStep: string | null
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
