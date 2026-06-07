import { prisma } from '../../infrastructure/db/prisma'
import type {
  Media,
  Prisma,
  ProcessingJob,
  Transcript,
  TranscriptEditDraft,
  TranscriptSegment,
  TranscriptWord
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

export const findTranscriptSegmentsByTranscriptId = async (transcriptId: string): Promise<TranscriptSegment[]> =>
  prisma.transcriptSegment.findMany({
    where: {
      transcriptId
    },
    orderBy: {
      segmentIndex: 'asc'
    }
  })

export const findTranscriptWordsByTranscriptId = async (transcriptId: string): Promise<TranscriptWord[]> =>
  prisma.transcriptWord.findMany({
    where: {
      transcriptId
    },
    orderBy: {
      wordIndex: 'asc'
    }
  })

export const findActiveTranscriptEditDraftByTranscriptId = async (
  transcriptId: string
): Promise<TranscriptEditDraft | null> =>
  prisma.transcriptEditDraft.findFirst({
    where: {
      transcriptId,
      appliedAt: null,
      discardedAt: null
    }
  })

export const findTranscriptEditDraftByTranscriptId = async (
  transcriptId: string
): Promise<TranscriptEditDraft | null> =>
  prisma.transcriptEditDraft.findUnique({
    where: {
      transcriptId
    }
  })

export type CreateTranscriptEditDraftData = {
  transcriptId: string
  userId: string
  baseTranscriptVersion: number
  clientSequence: number
  blocks: Prisma.InputJsonValue
}

export const upsertTranscriptEditDraft = async (data: CreateTranscriptEditDraftData): Promise<TranscriptEditDraft> =>
  prisma.transcriptEditDraft.upsert({
    where: {
      transcriptId: data.transcriptId
    },
    create: data,
    update: {
      baseTranscriptVersion: data.baseTranscriptVersion,
      clientSequence: data.clientSequence,
      blocks: data.blocks,
      discardedAt: null,
      revision: {
        increment: 1
      }
    }
  })

export const discardActiveTranscriptEditDraft = async (transcriptId: string): Promise<void> => {
  await prisma.transcriptEditDraft.updateMany({
    where: {
      transcriptId,
      appliedAt: null,
      discardedAt: null
    },
    data: {
      discardedAt: new Date()
    }
  })
}
