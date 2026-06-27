"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

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

export function useGeneratedAssetDownloadUrl(
  assetId: string | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: assetQueryKeys.downloadUrl(assetId ?? "none"),
    queryFn: () => assetService.getDownloadUrl(assetId!),
    enabled: enabled && Boolean(assetId),
    staleTime: 4 * 60 * 1000,
    retry: 1,
  })
}

export function useDeleteGeneratedAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assetId: string) => assetService.remove(assetId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: assetQueryKeys.lists(),
      }),
  })
}
