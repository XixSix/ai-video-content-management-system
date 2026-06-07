import * as assetsRepo from './assets.repository'
import * as storageService from '../../infrastructure/s3/uploader'
import { AssetsError } from './assets.error'
import { toAssetResponseData } from './assets.util'
import type { ListAssetsQuery } from './assets.schema'
import type {
  AssetResponseData,
  CreateAssetDownloadUrlResult,
  GeneratedAssetRecord,
  PaginatedResult
} from './assets.types'

export const listAssets = async (
  userId: string,
  query: ListAssetsQuery
): Promise<PaginatedResult<AssetResponseData>> => {
  const page: number = query.page
  const limit: number = query.limit
  const skip: number = (page - 1) * limit

  const [items, total] = await assetsRepo.findAssetsByUserId(
    {
      userId,
      assetType: query.assetType,
      mediaId: query.mediaId,
      transcriptId: query.transcriptId,
      chapterId: query.chapterId
    },
    skip,
    limit,
    query.sortBy,
    query.sortOrder
  )

  return {
    items: items.map(toAssetResponseData),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

const getOwnedAsset = async (userId: string, assetId: string): Promise<GeneratedAssetRecord> => {
  const asset = await assetsRepo.findAssetById(assetId)

  if (!asset) {
    throw AssetsError.notFound()
  }

  if (asset.userId !== userId) {
    throw AssetsError.forbidden()
  }

  return asset
}

export const createDownloadUrl = async (userId: string, assetId: string): Promise<CreateAssetDownloadUrlResult> => {
  const asset = await getOwnedAsset(userId, assetId)

  try {
    const url = await storageService.createPresignedGetUrl(asset.s3Bucket, asset.s3Key)

    return {
      url,
      expiresInSeconds: storageService.PRESIGNED_DOWNLOAD_EXPIRES_SECONDS
    }
  } catch (error: unknown) {
    if (error instanceof AssetsError) {
      throw error
    }

    throw AssetsError.storageFailure(error instanceof Error ? error.message : undefined)
  }
}

export const deleteAsset = async (userId: string, assetId: string): Promise<void> => {
  const asset = await getOwnedAsset(userId, assetId)

  try {
    await storageService.deleteObject(asset.s3Bucket, asset.s3Key)
  } catch (error: unknown) {
    throw AssetsError.storageFailure(error instanceof Error ? error.message : undefined)
  }

  await assetsRepo.deleteAsset(asset.id)
}
