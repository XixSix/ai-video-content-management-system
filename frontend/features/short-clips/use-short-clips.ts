"use client"

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"

import { shortClipsService } from "./short-clips.service"
import type {
  ClipCandidateListQuery,
  GenerateShortClipsPreferences,
  ShortClipListQuery,
  ShortClipData,
} from "./short-clips.types"
import { shortClipsQueryKeys } from "./short-clips-query-keys"

export function useClipCandidates(
  mediaId: string | null | undefined,
  query: ClipCandidateListQuery,
  enabled = true
) {
  return useQuery({
    queryKey: shortClipsQueryKeys.candidateList(mediaId ?? "", query),
    queryFn: () => shortClipsService.listCandidates(mediaId!, query),
    enabled: enabled && Boolean(mediaId),
  })
}

export function useShortClips(
  mediaId: string | null | undefined,
  query: ShortClipListQuery,
  enabled = true
) {
  return useQuery({
    queryKey: shortClipsQueryKeys.shortClipList(mediaId ?? "", query),
    queryFn: () => shortClipsService.listShortClips(mediaId!, query),
    enabled: enabled && Boolean(mediaId),
  })
}

export function useGenerateShortClips() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      mediaId,
      preferences,
    }: {
      mediaId: string
      preferences: GenerateShortClipsPreferences
    }) => shortClipsService.generate(mediaId, preferences),
    onSuccess: (_data, { mediaId }) => {
      void queryClient.invalidateQueries({
        queryKey: shortClipsQueryKeys.media(mediaId),
      })
    },
  })
}

export function useShortClipDownloadUrls(
  shortClips: ShortClipData[],
  enabled = true
) {
  const queries = useQueries({
    queries: shortClips.map((shortClip) => ({
      queryKey: [
        ...shortClipsQueryKeys.shortClips(shortClip.mediaId),
        shortClip.id,
        "download-url",
      ] as const,
      queryFn: () => shortClipsService.getDownloadUrl(shortClip.id),
      enabled:
        enabled &&
        shortClip.status === "READY" &&
        shortClip.assets.some((asset) => asset.assetType === "SHORT_CLIP_VIDEO"),
      staleTime: 4 * 60 * 1000,
      retry: 1,
    })),
  })

  return shortClips.reduce<Record<string, string>>((urls, shortClip, index) => {
    const url = queries[index]?.data?.url

    if (url) {
      urls[shortClip.id] = url
    }

    return urls
  }, {})
}
