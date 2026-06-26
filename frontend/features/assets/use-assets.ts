"use client"

import { useQuery } from "@tanstack/react-query"

import { assetService } from "./asset.service"
import type { GeneratedAssetListQuery } from "./asset.types"
import { assetQueryKeys } from "./asset-query-keys"

export function useGeneratedAssets(query: GeneratedAssetListQuery, enabled = true) {
  return useQuery({
    queryKey: assetQueryKeys.list(query),
    queryFn: () => assetService.list(query),
    enabled,
  })
}
