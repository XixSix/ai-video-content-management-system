import { prisma } from '../../infrastructure/db/prisma'
import type { AssetType, GeneratedAsset, Prisma } from '../../infrastructure/db/generated/prisma/client'
import type { AssetSortField, SortOrder } from './assets.types'

export interface ListAssetsFilters {
  userId: string
  assetType?: AssetType
  mediaId?: string
  transcriptId?: string
  chapterId?: string
}

const buildAssetWhere = (filters: ListAssetsFilters): Prisma.GeneratedAssetWhereInput => ({
  userId: filters.userId,
  ...(filters.assetType ? { assetType: filters.assetType } : {}),
  ...(filters.mediaId ? { mediaId: filters.mediaId } : {}),
  ...(filters.transcriptId ? { transcriptId: filters.transcriptId } : {}),
  ...(filters.chapterId ? { chapterId: filters.chapterId } : {})
})

export const findAssetsByUserId = async (
  filters: ListAssetsFilters,
  skip: number,
  take: number,
  sortBy: AssetSortField,
  sortOrder: SortOrder
): Promise<[GeneratedAsset[], number]> => {
  const where = buildAssetWhere(filters)

  return Promise.all([
    prisma.generatedAsset.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder }
    }),
    prisma.generatedAsset.count({ where })
  ])
}

export const findAssetById = async (id: string): Promise<GeneratedAsset | null> =>
  prisma.generatedAsset.findUnique({
    where: { id }
  })

export const deleteAsset = async (id: string): Promise<GeneratedAsset> =>
  prisma.generatedAsset.delete({
    where: { id }
  })
