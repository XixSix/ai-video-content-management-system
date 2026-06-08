import { prisma } from '../../infrastructure/db/prisma'
import type {
  ClipCandidate,
  ClipCandidateStatus,
  Media,
  Prisma,
  ProcessingJob,
  Transcript
} from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType } from '../../infrastructure/db/generated/prisma/client'
import type { ClipCandidateSortField, SortOrder } from './short-clips.types'

export interface ListClipCandidatesFilters {
  mediaId: string
  userId: string
  status?: ClipCandidateStatus
  transcriptId?: string
  chapterId?: string
  jobId?: string
}

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

export const countTranscriptSegmentsByTranscriptId = async (transcriptId: string): Promise<number> =>
  prisma.transcriptSegment.count({
    where: {
      transcriptId
    }
  })

export const findActiveShortClipJobByMediaIdAndUserId = async (
  mediaId: string,
  userId: string
): Promise<ProcessingJob | null> =>
  prisma.processingJob.findFirst({
    where: {
      mediaId,
      userId,
      jobType: JobType.GENERATE_SHORT_CLIPS,
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

const buildClipCandidateWhere = (filters: ListClipCandidatesFilters): Prisma.ClipCandidateWhereInput => ({
  mediaId: filters.mediaId,
  media: {
    userId: filters.userId
  },
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.transcriptId ? { transcriptId: filters.transcriptId } : {}),
  ...(filters.chapterId ? { chapterId: filters.chapterId } : {}),
  ...(filters.jobId ? { jobId: filters.jobId } : {})
})

export const findClipCandidatesByMediaIdAndUserId = async (
  filters: ListClipCandidatesFilters,
  skip: number,
  take: number,
  sortBy: ClipCandidateSortField,
  sortOrder: SortOrder
): Promise<[ClipCandidate[], number]> => {
  const where = buildClipCandidateWhere(filters)

  return Promise.all([
    prisma.clipCandidate.findMany({
      where,
      skip,
      take,
      orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'desc' }]
    }),
    prisma.clipCandidate.count({ where })
  ])
}

export const findClipCandidateById = async (id: string): Promise<ClipCandidate | null> =>
  prisma.clipCandidate.findUnique({
    where: { id }
  })
