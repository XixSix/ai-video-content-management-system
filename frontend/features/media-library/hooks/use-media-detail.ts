"use client"

import { useEffect, useRef } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"

import {
  getPreviewPollingInterval,
  shouldPollMediaDetailPreviews,
} from "../lib/media-previews"
import { mediaService } from "../services/media.service"
import { mediaQueryKeys } from "./media-query-keys"

type UseMediaDetailOptions = {
  enabled?: boolean
  pollUntilReady?: boolean
}

export function useMediaDetail(
  workspaceId: string,
  mediaId: string | null,
  { enabled = true, pollUntilReady = false }: UseMediaDetailOptions = {}
) {
  const pollingStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    pollingStartedAtRef.current = null
  }, [mediaId, pollUntilReady, workspaceId])

  return useQuery({
    queryKey: mediaQueryKeys.detail(workspaceId, mediaId ?? "none"),
    queryFn: () => mediaService.get(workspaceId, mediaId!),
    enabled: Boolean(workspaceId) && Boolean(mediaId) && enabled,
    staleTime: 4 * 60 * 1000,
    retry: 1,
    refetchInterval: (query) => {
      if (!pollUntilReady) {
        pollingStartedAtRef.current = null
        return false
      }

      const media = query.state.data?.media

      if (!media || !shouldPollMediaDetailPreviews(media)) {
        pollingStartedAtRef.current = null
        return false
      }

      if (pollingStartedAtRef.current === null) {
        pollingStartedAtRef.current = Date.now()
      }

      return getPreviewPollingInterval(pollingStartedAtRef.current)
    },
  })
}

export function useMediaDetails(
  workspaceId: string,
  mediaIds: string[],
  { enabled = true, pollUntilReady = false }: UseMediaDetailOptions = {}
) {
  const pollingStartedAtByMediaIdRef = useRef(new Map<string, number>())

  useEffect(() => {
    const nextIds = new Set(mediaIds)

    Array.from(pollingStartedAtByMediaIdRef.current.keys()).forEach((mediaId) => {
      if (!nextIds.has(mediaId)) {
        pollingStartedAtByMediaIdRef.current.delete(mediaId)
      }
    })
  }, [mediaIds])

  const queries = useQueries({
    queries: mediaIds.map((mediaId) => ({
      queryKey: mediaQueryKeys.detail(workspaceId, mediaId),
      queryFn: () => mediaService.get(workspaceId, mediaId),
      enabled: Boolean(workspaceId) && enabled,
      staleTime: 4 * 60 * 1000,
      retry: 1,
      refetchInterval: (query: {
        state: { data?: Awaited<ReturnType<typeof mediaService.get>> }
      }) => {
        if (!pollUntilReady) {
          pollingStartedAtByMediaIdRef.current.delete(mediaId)
          return false
        }

        const media = query.state.data?.media

        if (!media || !shouldPollMediaDetailPreviews(media)) {
          pollingStartedAtByMediaIdRef.current.delete(mediaId)
          return false
        }

        if (!pollingStartedAtByMediaIdRef.current.has(mediaId)) {
          pollingStartedAtByMediaIdRef.current.set(mediaId, Date.now())
        }

        return getPreviewPollingInterval(
          pollingStartedAtByMediaIdRef.current.get(mediaId) ?? null
        )
      },
    })),
  })

  return queries
}
