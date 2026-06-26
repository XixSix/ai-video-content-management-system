"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { shortClipsService } from "./short-clips.service"
import type {
  ClipCandidateListQuery,
  ShortClipListQuery,
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
    mutationFn: (mediaId: string) => shortClipsService.generate(mediaId),
    onSuccess: (_data, mediaId) => {
      void queryClient.invalidateQueries({
        queryKey: shortClipsQueryKeys.media(mediaId),
      })
    },
  })
}
