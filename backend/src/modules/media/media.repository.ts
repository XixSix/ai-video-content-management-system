import { prisma } from '../../infrastructure/db/prisma'
import type { Media, Prisma } from '../../infrastructure/db/generated/prisma/client'

export const createMedia = async (data: Prisma.MediaCreateInput | Prisma.MediaUncheckedCreateInput): Promise<Media> =>
  prisma.media.create({ data })

export const findMediaByS3Key = async (s3Bucket: string, s3Key: string): Promise<Media | null> =>
  prisma.media.findUnique({
    where: {
      s3Bucket_s3Key: {
        s3Bucket,
        s3Key
      }
    }
  })

export const findMediaById = async (id: string): Promise<Media | null> =>
  prisma.media.findUnique({
    where: { id }
  })

export const updateMedia = async (id: string, data: Prisma.MediaUpdateInput): Promise<Media> =>
  prisma.media.update({
    where: { id },
    data
  })

export const findExistingUploadedMediaById = async (id: string): Promise<{ media?: Media } | undefined> => {
  const media = await findMediaById(id)
  if (media) return { media }

  return undefined
}
