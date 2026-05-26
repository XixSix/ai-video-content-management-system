import { prisma } from '../../infrastructure/db/prisma'
import type {
  Media,
  Prisma,
  ProcessingJob,
  Transcript,
  TranscriptSegment
} from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType } from '../../infrastructure/db/generated/prisma/client'

export const findMediaById = async (id: string): Promise<Media | null> =>
  prisma.media.findUnique({
    where: { id }
  })

export const createProcessingJob = async (data: Prisma.ProcessingJobUncheckedCreateInput): Promise<ProcessingJob> =>
  prisma.processingJob.create({ data })

export const updateProcessingJob = async (id: string, data: Prisma.ProcessingJobUpdateInput): Promise<ProcessingJob> =>
  prisma.processingJob.update({
    where: { id },
    data
  })

export const findActiveTranscriptJobByMediaIdAndUserId = async (
  mediaId: string,
  userId: string
): Promise<ProcessingJob | null> =>
  prisma.processingJob.findFirst({
    where: {
      mediaId,
      userId,
      jobType: JobType.TRANSCRIBE,
      status: {
        notIn: [JobStatus.COMPLETED, JobStatus.FAILED]
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

export const findTranscriptsByMediaIdAndUserId = async (mediaId: string, userId: string): Promise<Transcript[]> =>
  prisma.transcript.findMany({
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

export const findTranscriptByIdAndUserId = async (transcriptId: string, userId: string): Promise<Transcript | null> =>
  prisma.transcript.findFirst({
    where: {
      id: transcriptId,
      media: {
        userId
      }
    }
  })

export const findTranscriptSegmentsByTranscriptIdAndUserId = async (
  transcriptId: string,
  userId: string
): Promise<TranscriptSegment[] | null> => {
  const transcript = await prisma.transcript.findFirst({
    where: {
      id: transcriptId,
      media: {
        userId
      }
    },
    select: {
      id: true
    }
  })

  if (!transcript) {
    return null
  }

  return prisma.transcriptSegment.findMany({
    where: {
      transcriptId
    },
    orderBy: {
      segmentIndex: 'asc'
    }
  })
}
