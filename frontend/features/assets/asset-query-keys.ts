import type { GeneratedAssetListQuery } from "./asset.types"

export const assetQueryKeys = {
  all: ["assets"] as const,
  lists: () => [...assetQueryKeys.all, "list"] as const,
  list: (query: GeneratedAssetListQuery) =>
    [...assetQueryKeys.lists(), query] as const,
  detail: (assetId: string) => [...assetQueryKeys.all, "detail", assetId] as const,
  downloadUrl: (assetId: string) =>
    [...assetQueryKeys.detail(assetId), "download-url"] as const,
}
