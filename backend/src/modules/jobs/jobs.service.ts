import type { ProcessingJob } from '../../infrastructure/db/generated/prisma/client'
import { JobsError } from './jobs.error'
import * as jobsRepo from './jobs.repository'
import type { ListJobsQuery } from './jobs.schema'
import type { JobEventData, JobEventName, JobResponseData, PaginatedResult } from './jobs.types'

export const JOB_EVENT_POLL_INTERVAL_MS = 2000
export const JOB_EVENT_HEARTBEAT_INTERVAL_MS = 15000

export const getJob = async (userId: string, jobId: string): Promise<JobResponseData> => {
  const job = await jobsRepo.findJobByIdAndUserId(jobId, userId)

  if (!job) {
    throw JobsError.notFound()
  }

  return toJobResponseData(job)
}

export const listJobs = async (userId: string, query: ListJobsQuery): Promise<PaginatedResult<JobResponseData>> => {
  const page = query.page
  const limit = query.limit
  const skip = (page - 1) * limit
  const [items, total] = await jobsRepo.findJobsByUserId(
    {
      userId,
      status: query.status,
      jobType: query.jobType
    },
    skip,
    limit
  )

  return {
    items: items.map(toJobResponseData),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

export const toJobEventData = (job: JobResponseData): JobEventData => ({
  ...job,
  jobId: job.id
})

export const getJobEventName = (job: JobResponseData): JobEventName => {
  if (job.status === 'COMPLETED') {
    return 'job.completed'
  }

  if (job.status === 'FAILED') {
    return 'job.failed'
  }

  return 'job.updated'
}

export const isTerminalJob = (job: JobResponseData): boolean => job.status === 'COMPLETED' || job.status === 'FAILED'

export const hasJobChanged = (previous: JobResponseData, next: JobResponseData): boolean =>
  previous.updatedAt.getTime() !== next.updatedAt.getTime() ||
  previous.status !== next.status ||
  previous.progress !== next.progress ||
  previous.errorCode !== next.errorCode ||
  previous.errorMessage !== next.errorMessage ||
  JSON.stringify(previous.output) !== JSON.stringify(next.output)

const toJobResponseData = (job: ProcessingJob): JobResponseData => ({
  id: job.id,
  mediaId: job.mediaId,
  jobType: job.jobType,
  status: job.status,
  progress: job.progress,
  errorCode: job.errorCode,
  errorMessage: job.errorMessage,
  output: job.output,
  attemptCount: job.attemptCount,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  startedAt: job.startedAt,
  completedAt: job.completedAt
})
