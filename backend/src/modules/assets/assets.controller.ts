import type { ParamsRequestHandler, QueryRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type { AssetParams, ListAssetsQuery } from './assets.schema'
import * as assetsService from './assets.service'
import type { AssetResponseData, CreateAssetDownloadUrlResult, PaginatedResult } from './assets.types'

export const list: QueryRequestHandler<ListAssetsQuery> = async (req, res, next): Promise<void> => {
  try {
    const query = req.query as ListAssetsQuery
    const result = await assetsService.listAssets(req.user!.id, query)

    sendSuccess<{ items: AssetResponseData[]; meta: Omit<PaginatedResult<never>, 'items'> }>(res, {
      items: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const createDownloadUrl: ParamsRequestHandler<AssetParams> = async (req, res, next): Promise<void> => {
  try {
    const result: CreateAssetDownloadUrlResult = await assetsService.createDownloadUrl(req.user!.id, req.params.assetId)

    sendSuccess<CreateAssetDownloadUrlResult>(res, result)
  } catch (error: unknown) {
    next(error)
  }
}

export const remove: ParamsRequestHandler<AssetParams> = async (req, res, next): Promise<void> => {
  try {
    await assetsService.deleteAsset(req.user!.id, req.params.assetId)

    sendSuccess<{ message: string }>(res, {
      message: 'Asset deleted successfully'
    })
  } catch (error: unknown) {
    next(error)
  }
}
