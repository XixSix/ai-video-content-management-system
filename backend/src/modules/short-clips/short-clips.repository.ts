import { prisma } from '../../infrastructure/db/prisma'
import type {
  ClipCandidate,
  ClipCandidateStatus,
  GeneratedAsset,
  Media,
  Prisma,
  ProcessingJob,
  ShortClipStatus,
  Transcript
} from '../../infrastructure/db/generated/prisma/client'
import { AssetType, JobStatus, JobType } from '../../infrastructure/db/generated/prisma/client'
import type {
  ClipCandidateRecord,
  ClipCandidateSortField,
  ShortClipRecord,
  ShortClipSortField,
  SortOrder
} from './short-clips.types'

export interface ListClipCandidatesFilters {
  mediaId: string
  userId: string
  status?: ClipCandidateStatus
  transcriptId?: string
  chapterId?: string
  jobId?: string
}

export interface ListShortClipsFilters {
  mediaId: string
  userId: string
  status?: ShortClipStatus
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

export const findTranscriptByIdAndMediaIdAndUserId = async (
  transcriptId: string,
  mediaId: string,
  userId: string
): Promise<Transcript | null> =>
  prisma.transcript.findFirst({
    where: {
      id: transcriptId,
      mediaId,
      media: {
        userId
      }
    }
  })

export const countTranscriptSegmentsByTranscriptId = async (transcriptId: string): Promise<number> =>
  prisma.transcriptSegment.count({
    where: {
      transcriptId
    }
  })

export const findActiveGenerateShortClipsJobByMediaIdAndUserId = async (
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
): Promise<[ClipCandidateRecord[], number]> => {
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

const buildShortClipWhere = (filters: ListShortClipsFilters): Prisma.ShortClipWhereInput => ({
  mediaId: filters.mediaId,
  userId: filters.userId,
  ...(filters.status ? { status: filters.status } : {})
})

export const findShortClipsByMediaIdAndUserId = async (
  filters: ListShortClipsFilters,
  skip: number,
  take: number,
  sortBy: ShortClipSortField,
  sortOrder: SortOrder
): Promise<[ShortClipRecord[], number]> => {
  const where = buildShortClipWhere(filters)

  return Promise.all([
    prisma.shortClip.findMany({
      where,
      skip,
      take,
      orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'desc' }],
      include: {
        candidate: true,
        generatedAssets: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    }),
    prisma.shortClip.count({ where })
  ])
}

export const findShortClipById = async (id: string): Promise<ShortClipRecord | null> =>
  prisma.shortClip.findUnique({
    where: { id },
    include: {
      candidate: true,
      generatedAssets: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

export const findLatestShortClipVideoAsset = async (
  shortClipId: string,
  userId: string
): Promise<GeneratedAsset | null> =>
  prisma.generatedAsset.findFirst({
    where: {
      shortClipId,
      userId,
      assetType: AssetType.SHORT_CLIP_VIDEO
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
