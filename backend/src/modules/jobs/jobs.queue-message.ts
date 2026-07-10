import type { JobType } from '../../infrastructure/db/generated/prisma/client'

export const WORKER_JOB_MESSAGE_VERSION = 1

export type WorkerJobMessage<TJobType extends JobType = JobType, TTaskName extends string = string> = Record<
  string,
  unknown
> & {
  version: typeof WORKER_JOB_MESSAGE_VERSION
  jobId: string
  jobType: TJobType
  taskName: TTaskName
}

export const buildWorkerJobMessage = <TJobType extends JobType, TTaskName extends string>(input: {
  jobId: string
  jobType: TJobType
  taskName: TTaskName
}): WorkerJobMessage<TJobType, TTaskName> => ({
  version: WORKER_JOB_MESSAGE_VERSION,
  jobId: input.jobId,
  jobType: input.jobType,
  taskName: input.taskName
})
