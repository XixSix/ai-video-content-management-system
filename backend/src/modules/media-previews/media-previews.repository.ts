import { prisma } from '../../infrastructure/db/prisma'
import type { Prisma, ProcessingJob } from '../../infrastructure/db/generated/prisma/client'

export const updateProcessingJob = async (id: string, data: Prisma.ProcessingJobUpdateInput): Promise<ProcessingJob> =>
  prisma.processingJob.update({
    where: { id },
    data
  })
