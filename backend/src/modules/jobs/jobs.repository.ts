import { prisma } from '../../infrastructure/db/prisma'
import type { ProcessingJob } from '../../infrastructure/db/generated/prisma/client'

export const findJobByIdAndUserId = async (id: string, userId: string): Promise<ProcessingJob | null> =>
  prisma.processingJob.findFirst({
    where: {
      id,
      userId
    }
  })
