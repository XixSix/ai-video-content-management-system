"use client"

import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  getPreviewPollingInterval,
  shouldPollMediaListPreviews,
} from "../lib/media-previews"
import { mapMediaResponseToLibraryItem } from "../media-library.mapper"
import type {
  MediaListQuery,
  MediaListResponseData,
} from "../media-library.types"
import { mediaService } from "../services/media.service"
import { mediaQueryKeys } from "./media-query-keys"

export function useMediaList(workspaceId: string, query: MediaListQuery) {
  const pollingStartedAtRef = useRef<number | null>(null)
  const querySignature = JSON.stringify(query)

  useEffect(() => {
    pollingStartedAtRef.current = null
  }, [querySignature, workspaceId])

  return useQuery({
    queryKey: mediaQueryKeys.list(workspaceId, query),
    queryFn: () => mediaService.list(workspaceId, query),
    enabled: Boolean(workspaceId),
    refetchInterval: (result) => {
      const data = result.state.data as MediaListResponseData | undefined

      if (!data || !data.items.some(shouldPollMediaListPreviews)) {
        pollingStartedAtRef.current = null
        return false
      }

      if (pollingStartedAtRef.current === null) {
        pollingStartedAtRef.current = Date.now()
      }

      return getPreviewPollingInterval(pollingStartedAtRef.current)
    },
    select: (data) => ({
      ...data,
      items: data.items.map(mapMediaResponseToLibraryItem),
    }),
  })
}
