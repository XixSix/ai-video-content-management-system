import { z } from 'zod'
import { JobStatus, JobType } from '../../infrastructure/db/generated/prisma/client'

export const jobParamsSchema = z.strictObject({
  jobId: z.uuid()
})

export const listJobsQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(JobStatus).optional(),
  jobType: z.enum(JobType).optional()
})

export type JobParams = z.infer<typeof jobParamsSchema>
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>
