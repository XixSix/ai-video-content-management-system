"use client"

import { useQuery } from "@tanstack/react-query"

import { mapMediaResponseToLibraryItem } from "../media-library.mapper"
import type { MediaListQuery } from "../media-library.types"
import { mediaService } from "../services/media.service"
import { mediaQueryKeys } from "./media-query-keys"

export function useMediaList(workspaceId: string, query: MediaListQuery) {
  return useQuery({
    queryKey: mediaQueryKeys.list(workspaceId, query),
    queryFn: () => mediaService.list(workspaceId, query),
    enabled: Boolean(workspaceId),
    select: (data) => ({
      ...data,
      items: data.items.map(mapMediaResponseToLibraryItem),
    }),
  })
}
