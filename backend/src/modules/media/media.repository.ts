import { prisma } from '../../infrastructure/db/prisma'
import {
  AssetType,
  Media,
  MediaStatus,
  Prisma,
  type ProcessingJob
} from '../../infrastructure/db/generated/prisma/client'

type MediaSortField = 'createdAt' | 'title' | 'duration'
type SortOrder = 'asc' | 'desc'

const mediaWithLatestThumbnailArgs = {
  include: {
    generatedAssets: {
      where: {
        assetType: AssetType.THUMBNAIL
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 1
    }
  }
} satisfies Prisma.MediaDefaultArgs

export type MediaWithLatestThumbnail = Prisma.MediaGetPayload<typeof mediaWithLatestThumbnailArgs>

const mediaWithLatestPreviewAssetsArgs = {
  include: {
    generatedAssets: {
      where: {
        assetType: {
          in: [AssetType.THUMBNAIL, AssetType.THUMBNAIL_SPRITE, AssetType.WAVEFORM_PEAKS]
        }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    }
  }
} satisfies Prisma.MediaDefaultArgs

export type MediaWithLatestPreviewAssets = Prisma.MediaGetPayload<typeof mediaWithLatestPreviewAssetsArgs>

export const createMedia = async (data: Prisma.MediaCreateInput | Prisma.MediaUncheckedCreateInput): Promise<Media> =>
  prisma.media.create({ data })

export const findMediaByWorkspaceId = async (
  workspaceId: string,
  skip: number,
  take: number,
  status?: MediaStatus,
  sortBy: MediaSortField = 'createdAt',
  sortOrder: SortOrder = 'desc'
): Promise<[MediaWithLatestThumbnail[], number]> => {
  const where: Prisma.MediaWhereInput = {
    workspaceId,
    status: status ?? {
      not: 'DELETED'
    }
  }

  return Promise.all([
    prisma.media.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      ...mediaWithLatestThumbnailArgs
    }),
    prisma.media.count({ where })
  ])
}

export const findMediaByS3Key = async (s3Bucket: string, s3Key: string): Promise<Media | null> =>
  prisma.media.findUnique({
    where: {
      s3Bucket_s3Key: {
        s3Bucket,
        s3Key
      }
    }
  })

export const findMediaByIdInWorkspace = async (id: string, workspaceId: string): Promise<Media | null> =>
  prisma.media.findFirst({
    where: {
      id,
      workspaceId
    }
  })

export const findMediaWithPreviewAssetsByIdInWorkspace = async (
  id: string,
  workspaceId: string
): Promise<MediaWithLatestPreviewAssets | null> =>
  prisma.media.findFirst({
    where: {
      id,
      workspaceId
    },
    ...mediaWithLatestPreviewAssetsArgs
  })

export const updateMedia = async (id: string, data: Prisma.MediaUpdateInput): Promise<Media> =>
  prisma.media.update({
    where: { id },
    data
  })

export const updateUploadingMedia = async (
  id: string,
  userId: string,
  data: Prisma.MediaUpdateManyMutationInput
): Promise<Media | null> => {
  const [updatedMedia] = await prisma.media.updateManyAndReturn({
    where: {
      id,
      userId,
      status: MediaStatus.UPLOADING
    },
    data
  })

  return updatedMedia ?? null
}

export interface CompleteUploadAndCreateJobsInput {
  id: string
  userId: string
  mediaData: Prisma.MediaUpdateManyMutationInput
  jobs?: Prisma.ProcessingJobUncheckedCreateInput[]
}

export interface CompleteUploadAndCreateJobsResult {
  media: Media | null
  jobs: ProcessingJob[]
}

export const completeUploadAndCreateJobs = async ({
  id,
  userId,
  mediaData,
  jobs = []
}: CompleteUploadAndCreateJobsInput): Promise<CompleteUploadAndCreateJobsResult> =>
  prisma.$transaction(async (tx) => {
    const [updatedMedia] = await tx.media.updateManyAndReturn({
      where: {
        id,
        userId,
        status: MediaStatus.UPLOADING
      },
      data: mediaData
    })

    if (!updatedMedia) {
      return {
        media: null,
        jobs: []
      }
    }

    const createdJobs = await Promise.all(jobs.map(async (jobData) => tx.processingJob.create({ data: jobData })))

    return {
      media: updatedMedia,
      jobs: createdJobs
    }
  })
