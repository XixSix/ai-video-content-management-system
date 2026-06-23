import { prisma } from '../../infrastructure/db/prisma'
import { Media, MediaStatus, Prisma } from '../../infrastructure/db/generated/prisma/client'

type MediaSortField = 'createdAt' | 'title' | 'duration'
type SortOrder = 'asc' | 'desc'

export const createMedia = async (data: Prisma.MediaCreateInput | Prisma.MediaUncheckedCreateInput): Promise<Media> =>
  prisma.media.create({ data })

export const findMediaByWorkspaceId = async (
  workspaceId: string,
  skip: number,
  take: number,
  status?: MediaStatus,
  sortBy: MediaSortField = 'createdAt',
  sortOrder: SortOrder = 'desc'
): Promise<[Media[], number]> => {
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
      orderBy: { [sortBy]: sortOrder }
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
