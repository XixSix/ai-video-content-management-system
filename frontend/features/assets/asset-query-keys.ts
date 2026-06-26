import type { GeneratedAssetListQuery } from "./asset.types"

export const assetQueryKeys = {
  all: ["assets"] as const,
  lists: () => [...assetQueryKeys.all, "list"] as const,
  list: (query: GeneratedAssetListQuery) =>
    [...assetQueryKeys.lists(), query] as const,
}
