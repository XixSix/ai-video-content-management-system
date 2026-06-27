import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type {
  GeneratedAssetDownloadUrlResponse,
  GeneratedAssetListQuery,
  GeneratedAssetListResponse,
} from "./asset.types"

export const assetService = {
  list(query: GeneratedAssetListQuery): Promise<GeneratedAssetListResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<GeneratedAssetListResponse>>(
        "/assets",
        { params: query }
      )
    )
  },

  getDownloadUrl(assetId: string): Promise<GeneratedAssetDownloadUrlResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<GeneratedAssetDownloadUrlResponse>>(
        `/assets/${assetId}/download-url`
      )
    )
  },

  remove(assetId: string): Promise<void> {
    return unwrapApiResponse(
      authenticatedApiClient.delete<ApiSuccess<undefined>>(`/assets/${assetId}`)
    ).then(() => undefined)
  },
}
