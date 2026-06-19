import type { MediaListQuery } from "../media-library.types"

export const mediaQueryKeys = {
  all: ["media"] as const,
  lists: () => [...mediaQueryKeys.all, "list"] as const,
  list: (query: MediaListQuery) =>
    [...mediaQueryKeys.lists(), query] as const,
  detail: (mediaId: string) =>
    [...mediaQueryKeys.all, "detail", mediaId] as const,
  preview: (mediaId: string) =>
    [...mediaQueryKeys.all, "preview", mediaId] as const,
}
