"use client"

import { useQuery } from "@tanstack/react-query"

import { mapMediaResponseToLibraryItem } from "../media-library.mapper"
import type { MediaListQuery } from "../media-library.types"
import { mediaService } from "../services/media.service"
import { mediaQueryKeys } from "./media-query-keys"

export function useMediaList(query: MediaListQuery) {
  return useQuery({
    queryKey: mediaQueryKeys.list(query),
    queryFn: () => mediaService.list(query),
    select: (data) => ({
      ...data,
      items: data.items.map(mapMediaResponseToLibraryItem),
    }),
  })
}
