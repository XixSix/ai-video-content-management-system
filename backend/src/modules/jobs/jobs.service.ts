import type { ProcessingJob } from '../../infrastructure/db/generated/prisma/client'
import { JobsError } from './jobs.error'
import * as jobsRepo from './jobs.repository'
import type { JobEventData, JobEventName, JobResponseData } from './jobs.types'

export const JOB_EVENT_POLL_INTERVAL_MS = 2000
export const JOB_EVENT_HEARTBEAT_INTERVAL_MS = 15000

export const getJob = async (userId: string, jobId: string): Promise<JobResponseData> => {
  const job = await jobsRepo.findJobByIdAndUserId(jobId, userId)

  if (!job) {
    throw JobsError.notFound()
  }

  return toJobResponseData(job)
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
  previous.errorMessage !== next.errorMessage ||
  JSON.stringify(previous.output) !== JSON.stringify(next.output)

const toJobResponseData = (job: ProcessingJob): JobResponseData => ({
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
