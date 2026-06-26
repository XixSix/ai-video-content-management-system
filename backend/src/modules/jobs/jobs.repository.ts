import { prisma } from '../../infrastructure/db/prisma'
import type { JobStatus, JobType, ProcessingJob, Prisma } from '../../infrastructure/db/generated/prisma/client'

export interface ListJobsFilters {
  userId: string
  status?: JobStatus
  jobType?: JobType
}

export const findJobByIdAndUserId = async (id: string, userId: string): Promise<ProcessingJob | null> =>
  prisma.processingJob.findFirst({
    where: {
      id,
      userId
    }
  })

const buildJobsWhere = (filters: ListJobsFilters): Prisma.ProcessingJobWhereInput => ({
  userId: filters.userId,
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.jobType ? { jobType: filters.jobType } : {})
})

export const findJobsByUserId = async (
  filters: ListJobsFilters,
  skip: number,
  take: number
): Promise<[ProcessingJob[], number]> => {
  const where = buildJobsWhere(filters)

  return Promise.all([
    prisma.processingJob.findMany({
      where,
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    }),
    prisma.processingJob.count({ where })
  ])
}
