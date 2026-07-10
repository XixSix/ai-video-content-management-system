import { prisma } from '../../infrastructure/db/prisma'
import type {
  Media,
  Prisma,
  ProcessingJob,
  Transcript,
  VideoChapter
} from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType } from '../../infrastructure/db/generated/prisma/client'

export const findMediaById = async (id: string): Promise<Media | null> =>
  prisma.media.findUnique({
    where: { id }
  })

export const findLatestTranscriptByMediaIdAndUserId = async (
  mediaId: string,
  userId: string
): Promise<Transcript | null> =>
  prisma.transcript.findFirst({
    where: {
      mediaId,
      media: {
        userId
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

export const findActiveGenerateChaptersJobByMediaIdAndUserId = async (
  mediaId: string,
  userId: string
): Promise<ProcessingJob | null> =>
  prisma.processingJob.findFirst({
    where: {
      mediaId,
      userId,
      jobType: JobType.GENERATE_CHAPTERS,
      status: {
        notIn: [JobStatus.COMPLETED, JobStatus.FAILED]
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

export const createProcessingJob = async (data: Prisma.ProcessingJobUncheckedCreateInput): Promise<ProcessingJob> =>
  prisma.processingJob.create({ data })

export const updateProcessingJob = async (id: string, data: Prisma.ProcessingJobUpdateInput): Promise<ProcessingJob> =>
  prisma.processingJob.update({
    where: { id },
    data
  })

export const findChaptersByMediaIdAndUserId = async (mediaId: string, userId: string): Promise<VideoChapter[]> =>
  prisma.videoChapter.findMany({
    where: {
      mediaId,
      media: {
        userId
      }
    },
    orderBy: [{ createdAt: 'desc' }, { chapterIndex: 'asc' }]
  })
